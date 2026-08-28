import { fetchAuthorCatalogApi, fetchSeriesCatalogApi, searchBooksApi } from './apiClient';

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
 * Fetches published books by an author using the backend API service.
 */
export async function fetchAuthorCatalog(authorName: string): Promise<CatalogBook[]> {
  const cleanAuthor = authorName.trim();
  if (!cleanAuthor) return [];
  if (authorCache.has(cleanAuthor)) {
    return authorCache.get(cleanAuthor)!;
  }

  try {
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
    console.warn('Error fetching author catalog from backend API:', error);
  }

  return [];
}

/**
 * Fetches all volumes in a book series using the backend API service.
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
    console.warn('Error fetching series catalog from backend API:', error);
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
 * Fetches detailed book metadata for unowned books via backend search API and Open Library.
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

  // 1. Query backend search API for book details
  try {
    const searchResults = await searchBooksApi(cleanTitle, authorName);
    if (searchResults && searchResults.length > 0) {
      const match = searchResults[0];
      if (match.description) description = match.description;
      if (match.coverUrl) coverUrl = match.coverUrl;
      if (match.authors && match.authors.length > 0) authors = match.authors;
      if (match.publishDate) publishDate = match.publishDate;
      if (match.pageCount) pageCount = match.pageCount;
      if (match.publisher) publisher = match.publisher;
      if (match.categories) categories = match.categories;
      if (match.isbn) foundIsbn = match.isbn;
    }
  } catch (err) {
    console.warn('Error fetching book details from backend API:', err);
  }

  // 2. Open Library Work ID lookup for description/cover if still missing
  if (workId && (!description || !coverUrl)) {
    const cleanWorkId = workId.replace(/^\/works\//, '').trim();
    if (cleanWorkId) {
      try {
        const olWorkUrl = `https://openlibrary.org/works/${cleanWorkId}.json`;
        const olRes = await fetch(olWorkUrl);
        if (olRes.ok) {
          const olData = await olRes.json();
          if (!description && olData.description) {
            if (typeof olData.description === 'string') {
              description = olData.description.replace(/<[^>]*>?/gm, '').trim();
            } else if (olData.description.value && typeof olData.description.value === 'string') {
              description = olData.description.value.replace(/<[^>]*>?/gm, '').trim();
            }
          }
          if (!coverUrl && Array.isArray(olData.covers) && olData.covers.length > 0 && olData.covers[0] > 0) {
            coverUrl = `https://covers.openlibrary.org/b/id/${olData.covers[0]}-L.jpg`;
          }
        }
      } catch (e) {
        console.warn('Error fetching OpenLibrary work details:', e);
      }
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
