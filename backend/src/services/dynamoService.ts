import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Book, CatalogBook, User, UserLibraryEntry, SeriesDetails, UserSeriesStatus } from '../types';
import { fetchBookByISBN as fetchGoogleBookByISBN, searchBooksByTitleAndAuthor as searchGoogleBooks } from './googleBooks';
import { fetchBookByISBN as fetchOlBookByISBN, resolveWorkIdFromIsbn } from './openLibrary';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME || 'shelfd-users';
const BOOKS_TABLE = process.env.BOOKS_TABLE_NAME || 'shelfd-books';
const USER_LIBRARY_TABLE = process.env.USER_LIBRARY_TABLE_NAME || 'shelfd-user-library';
const SERIES_TABLE = process.env.SERIES_TABLE_NAME || 'shelfd-series';
const USER_SERIES_STATUS_TABLE =
  process.env.USER_SERIES_STATUS_TABLE_NAME || 'shelfd-user-series-status';

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
// USERS TABLE OPERATIONS
// ----------------------------------------------------

export async function getUserById(id: string): Promise<User | null> {
  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { id },
  });
  const response = await docClient.send(command);
  return (response.Item as User) || null;
}

export async function putUser(user: User): Promise<User> {
  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
  });
  await docClient.send(command);
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

  const command = new QueryCommand({
    TableName: BOOKS_TABLE,
    IndexName: 'isbn-index',
    KeyConditionExpression: 'isbn = :isbn',
    ExpressionAttributeValues: {
      ':isbn': cleanIsbn,
    },
  });
  const response = await docClient.send(command);
  const items = (response.Items as CatalogBook[]) || [];
  if (items.length === 0) return null;
  return ensureCatalogBookWorkKey(items[0]);
}

export async function getCatalogBookById(id: string): Promise<CatalogBook | null> {
  const command = new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { id },
  });
  const response = await docClient.send(command);
  const item = (response.Item as CatalogBook) || null;
  if (!item) return null;
  return ensureCatalogBookWorkKey(item);
}

export async function putCatalogBook(catalogBook: CatalogBook): Promise<CatalogBook> {
  const command = new PutCommand({
    TableName: BOOKS_TABLE,
    Item: catalogBook,
  });
  await docClient.send(command);
  return catalogBook;
}

export async function backfillBooksTableWorkKeys(): Promise<{ scanned: number; updated: number }> {
  let scanned = 0;
  let updated = 0;

  try {
    const command = new ScanCommand({
      TableName: BOOKS_TABLE,
    });
    const response = await docClient.send(command);
    const items = (response.Items as CatalogBook[]) || [];
    scanned = items.length;

    for (const item of items) {
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
  const queryUserLib = new QueryCommand({
    TableName: USER_LIBRARY_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });
  const response = await docClient.send(queryUserLib);
  const entries = (response.Items as UserLibraryEntry[]) || [];

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
  const getEntry = new GetCommand({
    TableName: USER_LIBRARY_TABLE,
    Key: { userId, id },
  });
  const response = await docClient.send(getEntry);
  const entry = (response.Item as UserLibraryEntry) || null;
  if (!entry) return null;

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

  // 1. Check DynamoDB books catalog by ISBN FIRST to avoid API calls / duplication!
  if (cleanIsbn) {
    catalogBook = await findCatalogBookByIsbn(cleanIsbn);
  }

  // 1b. If cleanIsbn is missing (e.g. from AI book search or manual entry), try searching Google Books to resolve a real ISBN!
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

  // 2. If missing from DynamoDB books catalog, check Google Books API or use provided inputs
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

  // 3. Link user to shared book in user_library table
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

  const putEntryCmd = new PutCommand({
    TableName: USER_LIBRARY_TABLE,
    Item: entry,
  });
  await docClient.send(putEntryCmd);

  return mapToBook(entry, catalogBook);
}

export async function putBook(book: Book): Promise<Book> {
  return addBookForUser(book.ownerId, book);
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  const command = new DeleteCommand({
    TableName: USER_LIBRARY_TABLE,
    Key: { userId, id },
  });
  await docClient.send(command);
  return true;
}

export async function updateBook(
  userId: string,
  id: string,
  updates: Partial<Book>
): Promise<Book | null> {
  const getEntry = new GetCommand({
    TableName: USER_LIBRARY_TABLE,
    Key: { userId, id },
  });
  const res = await docClient.send(getEntry);
  const entry = (res.Item as UserLibraryEntry) || null;
  if (!entry) return null;

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

  const putCmd = new PutCommand({
    TableName: USER_LIBRARY_TABLE,
    Item: updatedEntry,
  });
  await docClient.send(putCmd);

  const catalogBook = await getCatalogBookById(entry.bookId);
  return catalogBook ? mapToBook(updatedEntry, catalogBook) : null;
}

// ----------------------------------------------------
// SERIES TABLE OPERATIONS
// ----------------------------------------------------

export async function getSeriesById(id: string): Promise<SeriesDetails | null> {
  const command = new GetCommand({
    TableName: SERIES_TABLE,
    Key: { id },
  });
  const response = await docClient.send(command);
  return (response.Item as SeriesDetails) || null;
}

export async function getAllSeries(): Promise<SeriesDetails[]> {
  const command = new ScanCommand({
    TableName: SERIES_TABLE,
  });
  const response = await docClient.send(command);
  return (response.Items as SeriesDetails[]) || [];
}

export async function putSeries(series: SeriesDetails): Promise<SeriesDetails> {
  const command = new PutCommand({
    TableName: SERIES_TABLE,
    Item: series,
  });
  await docClient.send(command);
  return series;
}

// ----------------------------------------------------
// USER SERIES STATUS TABLE OPERATIONS
// ----------------------------------------------------

export async function getUserSeriesStatus(
  userId: string,
  seriesId: string
): Promise<UserSeriesStatus | null> {
  const command = new GetCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    Key: { userId, seriesId },
  });
  const response = await docClient.send(command);
  return (response.Item as UserSeriesStatus) || null;
}

export async function getAllUserSeriesStatuses(userId: string): Promise<UserSeriesStatus[]> {
  const command = new QueryCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });
  const response = await docClient.send(command);
  return (response.Items as UserSeriesStatus[]) || [];
}

export async function putUserSeriesStatus(status: UserSeriesStatus): Promise<UserSeriesStatus> {
  const command = new PutCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    Item: status,
  });
  await docClient.send(command);
  return status;
}
