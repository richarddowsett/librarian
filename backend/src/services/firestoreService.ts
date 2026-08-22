import * as admin from 'firebase-admin';
import { Book, CatalogBook, User, UserLibraryEntry, SeriesDetails, UserSeriesStatus } from '../types';
import { fetchBookByISBN as fetchGoogleBookByISBN, searchBooksByTitleAndAuthor as searchGoogleBooks } from './googleBooks';
import { resolveWorkIdFromIsbn } from './openLibrary';

// Initialize Firebase Admin SDK if not initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

function mapToBook(entry: UserLibraryEntry, catalogBook: CatalogBook): Book {
  if (!catalogBook.isbn) {
    console.error('Error in mapToBook: Book ISBN is missing');
    throw new Error('Book ISBN is missing');
  }
  if (!catalogBook.workKey) {
    console.error(`Error in mapToBook: Book workId is missing. ISBN: ${catalogBook.isbn}`);
    throw new Error('Book workId is missing');
  }
  return {
    id: entry.id,
    ownerId: entry.userId,
    bookId: catalogBook.id,
    isbn: catalogBook.isbn,
    title: catalogBook.title,
    subtitle: catalogBook.subtitle || null,
    authors: catalogBook.authors || [],
    coverUrl: catalogBook.coverUrl || null,
    publisher: catalogBook.publisher || null,
    publishDate: catalogBook.publishDate || null,
    pageCount: catalogBook.pageCount || 0,
    description: catalogBook.description || null,
    categories: catalogBook.categories || [],
    language: catalogBook.language || null,
    workId: catalogBook.workKey,
    readStatus: entry.readStatus,
    rating: entry.rating || null,
    review: entry.review || null,
    seriesId: entry.seriesId || null,
    seriesName: entry.seriesName || null,
    seriesVolumeNumber: entry.seriesVolumeNumber || null,
    dateAdded: entry.dateAdded,
    dateRead: entry.dateRead || null,
  };
}

// ----------------------------------------------------
// USERS COLLECTION OPERATIONS
// ----------------------------------------------------

export async function getUserById(id: string): Promise<User | null> {
  const doc = await db.collection('users').doc(id).get();
  return doc.exists ? (doc.data() as User) : null;
}

export async function putUser(user: User): Promise<User> {
  await db.collection('users').doc(user.id).set(user, { merge: true });
  return user;
}

// ----------------------------------------------------
// SHARED BOOKS CATALOG OPERATIONS
// ----------------------------------------------------

export async function ensureCatalogBookWorkKey(catalogBook: CatalogBook): Promise<CatalogBook> {
  if (catalogBook.workKey && (catalogBook.workKey.startsWith('OL') || catalogBook.workKey.includes('/works/'))) {
    return catalogBook;
  }

  if (catalogBook.isbn && !catalogBook.isbn.startsWith('NOISBN')) {
    try {
      const resolvedWorkId = await resolveWorkIdFromIsbn(catalogBook.isbn);
      if (resolvedWorkId) {
        const updated: CatalogBook = {
          ...catalogBook,
          workKey: resolvedWorkId,
        };
        await putCatalogBook(updated);
        return updated;
      }
    } catch (err) {
      // Ignore lookup error
    }
  }
  return catalogBook;
}

export async function findCatalogBookByIsbn(isbn: string): Promise<CatalogBook | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '').trim().toUpperCase();
  if (!cleanIsbn || cleanIsbn.startsWith('NOISBN')) return null;

  const snapshot = await db.collection('books').where('isbn', '==', cleanIsbn).limit(1).get();
  if (snapshot.empty) return null;
  const catalogBook = snapshot.docs[0].data() as CatalogBook;
  return ensureCatalogBookWorkKey(catalogBook);
}

export async function getCatalogBookById(id: string): Promise<CatalogBook | null> {
  const doc = await db.collection('books').doc(id).get();
  if (!doc.exists) return null;
  const item = doc.data() as CatalogBook;
  return ensureCatalogBookWorkKey(item);
}

export async function putCatalogBook(catalogBook: CatalogBook): Promise<CatalogBook> {
  await db.collection('books').doc(catalogBook.id).set(catalogBook, { merge: true });
  return catalogBook;
}

export async function backfillBooksTableWorkKeys(): Promise<{ scanned: number; updated: number }> {
  let scanned = 0;
  let updated = 0;

  try {
    const snapshot = await db.collection('books').get();
    scanned = snapshot.size;

    for (const doc of snapshot.docs) {
      const item = doc.data() as CatalogBook;
      if (!item.workKey || (!item.workKey.startsWith('OL') && !item.workKey.includes('/works/'))) {
        if (item.isbn && !item.isbn.startsWith('NOISBN')) {
          const resolvedId = await resolveWorkIdFromIsbn(item.isbn);
          if (resolvedId) {
            const updatedBook: CatalogBook = {
              ...item,
              workKey: resolvedId,
            };
            await putCatalogBook(updatedBook);
            updated++;
          }
        }
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in backfillBooksTableWorkKeys:', err);
    }
  }

  return { scanned, updated };
}

// ----------------------------------------------------
// USER LIBRARY JUNCTION & BOOK OPERATIONS
// ----------------------------------------------------

export async function getBooksByOwner(userId: string): Promise<Book[]> {
  const snapshot = await db.collection('userLibrary').where('userId', '==', userId).get();
  const entries = snapshot.docs.map((doc) => doc.data() as UserLibraryEntry);

  const books: Book[] = [];
  for (const entry of entries) {
    const catalogBook = await getCatalogBookById(entry.bookId);
    if (catalogBook) {
      books.push(mapToBook(entry, catalogBook));
    }
  }
  return books;
}

export async function getBookById(userId: string, id: string): Promise<Book | null> {
  const doc = await db.collection('userLibrary').doc(id).get();
  if (!doc.exists) return null;
  const entry = doc.data() as UserLibraryEntry;
  if (entry.userId !== userId) return null;

  const catalogBook = await getCatalogBookById(entry.bookId);
  if (!catalogBook) return null;

  return mapToBook(entry, catalogBook);
}

export async function addBookForUser(userId: string, input: any): Promise<Book> {
  let cleanIsbn = (input.isbn || '').replace(/[-\s]/g, '').trim().toUpperCase();
  if (cleanIsbn.startsWith('NOISBN')) {
    cleanIsbn = '';
  }

  let catalogBook: CatalogBook | null = null;

  if (cleanIsbn) {
    catalogBook = await findCatalogBookByIsbn(cleanIsbn);
  }

  if (!catalogBook && !cleanIsbn && input.title) {
    try {
      const firstAuthor = Array.isArray(input.authors) && input.authors.length > 0 ? input.authors[0] : '';
      const searchHits = await searchGoogleBooks(input.title, firstAuthor);
      if (searchHits && searchHits.length > 0) {
        const hitWithIsbn = searchHits.find((b) => b.isbn && !b.isbn.startsWith('NOISBN'));
        if (hitWithIsbn && hitWithIsbn.isbn) {
          cleanIsbn = hitWithIsbn.isbn;
          catalogBook = await findCatalogBookByIsbn(cleanIsbn);
        }
      }
    } catch (err) {
      // Ignore lookup error
    }
  }

  if (!catalogBook) {
    let title = input.title || 'Untitled Book';
    let subtitle = input.subtitle || null;
    let authors = input.authors || ['Unknown Author'];
    let coverUrl = input.coverUrl || null;
    let publisher = input.publisher || null;
    let publishDate = input.publishDate || null;
    let pageCount = input.pageCount || 0;
    let description = input.description || null;
    let categories = input.categories || [];
    let language = input.language || null;
    let workKey = input.workId || null;

    if (cleanIsbn) {
      try {
        const googleMeta = await fetchGoogleBookByISBN(cleanIsbn);
        if (googleMeta) {
          title = googleMeta.title || title;
          subtitle = googleMeta.subtitle || subtitle;
          authors = googleMeta.authors || authors;
          coverUrl = googleMeta.coverUrl || coverUrl;
          publisher = googleMeta.publisher || publisher;
          publishDate = googleMeta.publishDate || publishDate;
          pageCount = googleMeta.pageCount || pageCount;
          description = googleMeta.description || description;
          categories = googleMeta.categories || categories;
          language = googleMeta.language || language;
          workKey = googleMeta.workKey || workKey;
        }
      } catch (err) {
        // Ignore Google fetch error
      }

      if (!workKey || (!workKey.startsWith('OL') && !workKey.includes('/works/'))) {
        try {
          const resolvedOlKey = await resolveWorkIdFromIsbn(cleanIsbn);
          if (resolvedOlKey) {
            workKey = resolvedOlKey;
          }
        } catch (err) {
          // Ignore OL resolution error
        }
      }
    }

    catalogBook = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      isbn: cleanIsbn || `NOISBN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      subtitle,
      authors,
      coverUrl,
      publisher,
      publishDate,
      pageCount,
      description,
      categories,
      language,
      workKey,
      createdAt: new Date().toISOString(),
    };

    await putCatalogBook(catalogBook);
  }

  const userBookId = input.id || `ub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const entry: UserLibraryEntry = {
    id: userBookId,
    userId,
    bookId: catalogBook.id,
    readStatus: input.readStatus || 'unread',
    rating: input.rating || null,
    review: input.review || null,
    seriesId: input.seriesId || null,
    seriesName: input.seriesName || null,
    seriesVolumeNumber: input.seriesVolumeNumber || null,
    dateAdded: input.dateAdded || new Date().toISOString(),
    dateRead: input.dateRead || null,
  };

  await db.collection('userLibrary').doc(userBookId).set(entry, { merge: true });

  return mapToBook(entry, catalogBook);
}

export async function putBook(book: Book): Promise<Book> {
  return addBookForUser(book.ownerId, book);
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  await db.collection('userLibrary').doc(id).delete();
  return true;
}

export async function updateBook(
  userId: string,
  id: string,
  updates: Partial<Book>
): Promise<Book | null> {
  const doc = await db.collection('userLibrary').doc(id).get();
  if (!doc.exists) return null;
  const entry = doc.data() as UserLibraryEntry;

  const updatedEntry: UserLibraryEntry = {
    ...entry,
    readStatus: updates.readStatus !== undefined ? updates.readStatus : entry.readStatus,
    rating: updates.rating !== undefined ? updates.rating : entry.rating,
    review: updates.review !== undefined ? updates.review : entry.review,
    seriesId: updates.seriesId !== undefined ? updates.seriesId : entry.seriesId,
    seriesName: updates.seriesName !== undefined ? updates.seriesName : entry.seriesName,
    seriesVolumeNumber:
      updates.seriesVolumeNumber !== undefined
        ? updates.seriesVolumeNumber
        : entry.seriesVolumeNumber,
    dateRead: updates.dateRead !== undefined ? updates.dateRead : entry.dateRead,
  };

  await db.collection('userLibrary').doc(id).set(updatedEntry, { merge: true });

  const catalogBook = await getCatalogBookById(entry.bookId);
  return catalogBook ? mapToBook(updatedEntry, catalogBook) : null;
}

// ----------------------------------------------------
// SERIES COLLECTION OPERATIONS
// ----------------------------------------------------

export async function getSeriesById(id: string): Promise<SeriesDetails | null> {
  const doc = await db.collection('series').doc(id).get();
  return doc.exists ? (doc.data() as SeriesDetails) : null;
}

export async function getAllSeries(): Promise<SeriesDetails[]> {
  const snapshot = await db.collection('series').get();
  return snapshot.docs.map((doc) => doc.data() as SeriesDetails);
}

export async function putSeries(series: SeriesDetails): Promise<SeriesDetails> {
  await db.collection('series').doc(series.id).set(series, { merge: true });
  return series;
}

// ----------------------------------------------------
// USER SERIES STATUS COLLECTION OPERATIONS
// ----------------------------------------------------

export async function getUserSeriesStatus(
  userId: string,
  seriesId: string
): Promise<UserSeriesStatus | null> {
  const docId = `${userId}_${seriesId}`;
  const doc = await db.collection('userSeriesStatus').doc(docId).get();
  return doc.exists ? (doc.data() as UserSeriesStatus) : null;
}

export async function getAllUserSeriesStatuses(userId: string): Promise<UserSeriesStatus[]> {
  const snapshot = await db.collection('userSeriesStatus').where('userId', '==', userId).get();
  return snapshot.docs.map((doc) => doc.data() as UserSeriesStatus);
}

export async function putUserSeriesStatus(status: UserSeriesStatus): Promise<UserSeriesStatus> {
  const docId = `${status.userId}_${status.seriesId}`;
  await db.collection('userSeriesStatus').doc(docId).set(status, { merge: true });
  return status;
}
