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
      const formatted: CatalogBook[] = remoteCatalog.map((item) => ({
        title: item.title,
        coverUrl: item.coverUrl,
        isbn: item.isbn,
        description: item.description,
        categories: item.categories,
        publisher: item.publisher,
        publishDate: item.publishDate,
        pageCount: item.pageCount,
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
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(cleanAuthor)}&maxResults=30`;
    const res = await fetch(googleBooksUrl);
    if (res.ok) {
      const data = await res.json();
      const items: any[] = data.items || [];
      const seenTitles = new Set<string>();
      const catalog: CatalogBook[] = [];

      items.forEach((item) => {
        const info = item.volumeInfo || {};
        const title: string = info.title || '';
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
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanSeries)}&maxResults=30`;
    const res = await fetch(googleBooksUrl);
    if (res.ok) {
      const data = await res.json();
      const items: any[] = data.items || [];
      const volumeMap = new Map<number, CatalogBook>();

      items.forEach((item) => {
        const info = item.volumeInfo || {};
        const title: string = info.title || '';
        const volNum = extractVolumeNumber(title) || null;
        if (volNum && volNum > 0 && !volumeMap.has(volNum)) {
          const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          volumeMap.set(volNum, {
            title: info.title,
            coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
            seriesVolumeNumber: volNum,
            description: info.description ? info.description.replace(/<[^>]*>?/gm, '') : undefined,
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
 * Fetches detailed Google Books metadata (publish date, blurb, page count, cover, categories) for unowned books.
 */
export async function fetchUnownedBookDetails(
  title: string,
  authorName?: string
): Promise<CatalogBookDetails> {
  const cacheKey = `${title.toLowerCase()}_${(authorName || '').toLowerCase()}`;
  if (detailsCache.has(cacheKey)) {
    return detailsCache.get(cacheKey)!;
  }

  try {
    const query = `intitle:${encodeURIComponent(title)}${authorName ? `+inauthor:${encodeURIComponent(authorName)}` : ''}`;
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo || {};
        const description = volumeInfo.description
          ? volumeInfo.description.replace(/<[^>]*>?/gm, '').trim()
          : undefined;

        const coverUrl =
          volumeInfo.imageLinks?.extraLarge ||
          volumeInfo.imageLinks?.large ||
          volumeInfo.imageLinks?.medium ||
          volumeInfo.imageLinks?.thumbnail;

        const isbnObj = Array.isArray(volumeInfo.industryIdentifiers)
          ? volumeInfo.industryIdentifiers.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')
          : undefined;

        const result: CatalogBookDetails = {
          title: volumeInfo.title || title,
          subtitle: volumeInfo.subtitle || undefined,
          authors: volumeInfo.authors || (authorName ? [authorName] : ['Unknown Author']),
          description,
          publishDate: volumeInfo.publishedDate,
          pageCount: volumeInfo.pageCount,
          publisher: volumeInfo.publisher,
          categories: volumeInfo.categories,
          language: volumeInfo.language,
          coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
          isbn: isbnObj?.identifier,
        };

        detailsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Error fetching Google Books details:', err);
  }

  const fallback: CatalogBookDetails = {
    title,
    authors: authorName ? [authorName] : ['Unknown Author'],
  };
  detailsCache.set(cacheKey, fallback);
  return fallback;
}
