import { fetchAuthorCatalogApi, fetchSeriesCatalogApi } from './apiClient';

export interface CatalogBook {
  title: string;
  coverUrl?: string;
  seriesVolumeNumber?: number;
  isbn?: string;
  description?: string;
  categories?: string[];
  publisher?: string;
  publishDate?: string;
  pageCount?: number;
  language?: string;
}

export function isEnglishCatalogBook(book: { title?: string; language?: string }): boolean {
  if (book.language) {
    const lang = book.language.trim().toLowerCase();
    if (lang && !lang.startsWith('en')) {
      return false;
    }
  }
  if (book.title && /[\u0400-\u04FF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0370-\u03FF]/.test(book.title)) {
    return false;
  }
  return true;
}

export function extractVolumeNumber(title: string): number | null {
  if (!title) return null;
  const regexes = [
    /(?:book|vol|volume|v\.)\s*#?\s*(\d+)/i,
    /#\s*(\d+)/,
    /\((\d+)\)/,
    /(?:^|\s)v(\d+)(?:\s|$)/i,
  ];

  for (const regex of regexes) {
    const match = title.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return null;
}

const authorCache = new Map<string, CatalogBook[]>();
const seriesCache = new Map<string, CatalogBook[]>();

/**
 * Fetches published books by an author using the backend Google Books proxy service.
 */
export async function fetchAuthorCatalog(authorName: string): Promise<CatalogBook[]> {
  const cleanAuthor = authorName.trim();
  if (!cleanAuthor) return [];
  if (authorCache.has(cleanAuthor)) {
    return authorCache.get(cleanAuthor)!;
  }

  try {
    // 1. Query backend Google Books Proxy service
    const remoteCatalog = await fetchAuthorCatalogApi(cleanAuthor);
    if (Array.isArray(remoteCatalog) && remoteCatalog.length > 0) {
      const formatted: CatalogBook[] = remoteCatalog
        .filter((item) => isEnglishCatalogBook({ title: item.title, language: item.language }))
        .map((item) => ({
          title: item.title,
          coverUrl: item.coverUrl,
          isbn: item.isbn,
          description: item.description,
          categories: item.categories,
          publisher: item.publisher,
          publishDate: item.publishDate,
          pageCount: item.pageCount,
          language: item.language,
          seriesVolumeNumber: extractVolumeNumber(item.title) || undefined,
        }));

      authorCache.set(cleanAuthor, formatted);
      return formatted;
    }
  } catch (error) {
    console.warn('Error fetching Google Books author catalog from backend:', error);
  }

  // 2. Direct Fallback to Google Books Public Search API if backend call unavailable
  try {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(cleanAuthor)}&langRestrict=en&maxResults=30`;
    const res = await fetch(googleBooksUrl);
    if (res.ok) {
      const data = await res.json();
      const items: any[] = data.items || [];
      const seenTitles = new Set<string>();
      const catalog: CatalogBook[] = [];

      items.forEach((item) => {
        const info = item.volumeInfo || {};
        const title: string = info.title || '';
        if (!isEnglishCatalogBook({ title: info.title, language: info.language })) {
          return;
        }

        const cleanTitle = title.trim().toLowerCase();
        if (cleanTitle && !seenTitles.has(cleanTitle)) {
          seenTitles.add(cleanTitle);
          const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          const isbnObj = Array.isArray(info.industryIdentifiers)
            ? info.industryIdentifiers.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')
            : undefined;

          catalog.push({
            title: info.title,
            coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
            isbn: isbnObj?.identifier,
            description: info.description ? info.description.replace(/<[^>]*>?/gm, '') : undefined,
            categories: info.categories,
            publisher: info.publisher,
            publishDate: info.publishedDate,
            pageCount: info.pageCount,
            language: info.language || 'en',
            seriesVolumeNumber: extractVolumeNumber(info.title) || undefined,
          });
        }
      });

      authorCache.set(cleanAuthor, catalog);
      return catalog;
    }
  } catch (error) {
    console.warn('Error fetching Google Books author catalog fallback:', error);
  }

  return [];
}

/**
 * Fetches all volumes in a book series using Google Books API.
 */
export async function fetchSeriesCatalog(seriesName: string): Promise<CatalogBook[]> {
  const cleanSeries = seriesName.trim();
  if (!cleanSeries) return [];
  if (seriesCache.has(cleanSeries)) {
    return seriesCache.get(cleanSeries)!;
  }

  try {
    const remoteCatalog = await fetchSeriesCatalogApi(cleanSeries);
    if (Array.isArray(remoteCatalog) && remoteCatalog.length > 0) {
      const volumeMap = new Map<number, CatalogBook>();
      remoteCatalog.forEach((item) => {
        const volNum = extractVolumeNumber(item.title) || null;
        if (volNum && volNum > 0 && !volumeMap.has(volNum)) {
          volumeMap.set(volNum, {
            title: item.title,
            coverUrl: item.coverUrl,
            seriesVolumeNumber: volNum,
            description: item.description,
          });
        }
      });

      const catalog = Array.from(volumeMap.values()).sort(
        (a, b) => (a.seriesVolumeNumber || 0) - (b.seriesVolumeNumber || 0)
      );

      if (catalog.length > 0) {
        seriesCache.set(cleanSeries, catalog);
        return catalog;
      }
    }
  } catch (error) {
    console.warn('Error fetching Google Books series catalog from backend:', error);
  }

  // Fallback to Google Books Public Search
  try {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanSeries)}&langRestrict=en&maxResults=30`;
    const res = await fetch(googleBooksUrl);
    if (res.ok) {
      const data = await res.json();
      const items: any[] = data.items || [];
      const volumeMap = new Map<number, CatalogBook>();

      items.forEach((item) => {
        const info = item.volumeInfo || {};
        const title: string = info.title || '';
        if (!isEnglishCatalogBook({ title: info.title, language: info.language })) {
          return;
        }

        const volNum = extractVolumeNumber(title) || null;
        if (volNum && volNum > 0 && !volumeMap.has(volNum)) {
          const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          volumeMap.set(volNum, {
            title: info.title,
            coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
            seriesVolumeNumber: volNum,
            description: info.description ? info.description.replace(/<[^>]*>?/gm, '') : undefined,
            language: info.language || 'en',
          });
        }
      });

      const catalog = Array.from(volumeMap.values()).sort(
        (a, b) => (a.seriesVolumeNumber || 0) - (b.seriesVolumeNumber || 0)
      );

      seriesCache.set(cleanSeries, catalog);
      return catalog;
    }
  } catch (error) {
    console.warn('Error fetching Google Books series catalog fallback:', error);
  }

  return [];
}

export interface CatalogBookDetails {
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  publishDate?: string;
  pageCount?: number;
  publisher?: string;
  coverUrl?: string;
  categories?: string[];
  language?: string;
  isbn?: string;
  seriesName?: string;
  seriesVolumeNumber?: number;
}

const detailsCache = new Map<string, CatalogBookDetails>();

/**
 * Fetches detailed book metadata (publish date, blurb, page count, cover, categories) for unowned books.
 */
export async function fetchUnownedBookDetails(
  title: string,
  authorName?: string,
  workId?: string,
  isbn?: string
): Promise<CatalogBookDetails> {
  const cleanTitle = title.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim() || title;
  const cacheKey = `${cleanTitle.toLowerCase()}_${(authorName || '').toLowerCase()}_${workId || ''}_${isbn || ''}`;
  if (detailsCache.has(cacheKey)) {
    return detailsCache.get(cacheKey)!;
  }

  let description: string | undefined = undefined;
  let coverUrl: string | undefined = undefined;
  let authors: string[] = authorName ? [authorName] : ['Unknown Author'];
  let publishDate: string | undefined = undefined;
  let pageCount: number | undefined = undefined;
  let publisher: string | undefined = undefined;
  let categories: string[] | undefined = undefined;
  let foundIsbn: string | undefined = isbn;

  // 1. If Open Library Work ID is present, fetch Work JSON directly for exact blurb & cover!
  if (workId) {
    const cleanWorkId = workId.replace(/^\/works\//, '').trim();
    if (cleanWorkId) {
      try {
        const olWorkUrl = `https://openlibrary.org/works/${cleanWorkId}.json`;
        const olRes = await fetch(olWorkUrl);
        if (olRes.ok) {
          const olData = await olRes.json();
          if (olData.description) {
            if (typeof olData.description === 'string') {
              description = olData.description.replace(/<[^>]*>?/gm, '').trim();
            } else if (olData.description.value && typeof olData.description.value === 'string') {
              description = olData.description.value.replace(/<[^>]*>?/gm, '').trim();
            }
          }
          if (Array.isArray(olData.covers) && olData.covers.length > 0 && olData.covers[0] > 0) {
            coverUrl = `https://covers.openlibrary.org/b/id/${olData.covers[0]}-L.jpg`;
          }
        }
      } catch (e) {
        console.warn('Error fetching OpenLibrary work details:', e);
      }
    }
  }

  // 2. Query Google Books for blurb, metadata, and high-res cover
  try {
    const query = `q=${encodeURIComponent(cleanTitle)}${authorName ? `+inauthor:${encodeURIComponent(authorName)}` : ''}`;
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?${query}&maxResults=3`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item = data.items.find((i: any) => i.volumeInfo?.description) || data.items[0];
        const volumeInfo = item.volumeInfo || {};

        if (!description && volumeInfo.description) {
          description = volumeInfo.description.replace(/<[^>]*>?/gm, '').trim();
        }

        if (!coverUrl) {
          const gCover =
            volumeInfo.imageLinks?.extraLarge ||
            volumeInfo.imageLinks?.large ||
            volumeInfo.imageLinks?.medium ||
            volumeInfo.imageLinks?.thumbnail ||
            volumeInfo.imageLinks?.smallThumbnail;
          if (gCover) {
            coverUrl = gCover.replace(/^http:/, 'https:');
          }
        }

        if (Array.isArray(volumeInfo.authors) && volumeInfo.authors.length > 0) {
          authors = volumeInfo.authors;
        }

        if (volumeInfo.publishedDate) publishDate = volumeInfo.publishedDate;
        if (volumeInfo.pageCount) pageCount = volumeInfo.pageCount;
        if (volumeInfo.publisher) publisher = volumeInfo.publisher;
        if (volumeInfo.categories) categories = volumeInfo.categories;

        if (!foundIsbn && Array.isArray(volumeInfo.industryIdentifiers)) {
          const isbnObj = volumeInfo.industryIdentifiers.find(
            (i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10'
          );
          if (isbnObj) foundIsbn = isbnObj.identifier;
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching Google Books details:', err);
  }

  // 3. Fallback: Open Library Search API if description or cover is still missing
  if (!description || !coverUrl) {
    try {
      const olSearchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanTitle)}&limit=1`;
      const olRes = await fetch(olSearchUrl);
      if (olRes.ok) {
        const olData = await olRes.json();
        if (olData.docs && olData.docs.length > 0) {
          const doc = olData.docs[0];
          if (!coverUrl && doc.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          }
          if (!description && Array.isArray(doc.first_sentence) && doc.first_sentence.length > 0) {
            description = `First Sentence: "${doc.first_sentence[0]}"`;
          }
          if ((!authors || authors[0] === 'Unknown Author') && Array.isArray(doc.author_name)) {
            authors = doc.author_name;
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching OpenLibrary search fallback:', e);
    }
  }

  const result: CatalogBookDetails = {
    title,
    authors,
    description: description || undefined,
    publishDate,
    pageCount,
    publisher,
    categories,
    coverUrl,
    isbn: foundIsbn,
  };

  detailsCache.set(cacheKey, result);
  return result;
}
