export interface CatalogBook {
  title: string;
  coverUrl?: string;
  seriesVolumeNumber?: number;
  isbn?: string;
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
 * Fetches popular/known published books by a given author from Open Library / Google Books.
 */
export async function fetchAuthorCatalog(authorName: string): Promise<CatalogBook[]> {
  const cleanAuthor = authorName.trim();
  if (!cleanAuthor) return [];
  if (authorCache.has(cleanAuthor)) {
    return authorCache.get(cleanAuthor)!;
  }

  try {
    // 1. Query Open Library Search API by author
    const openLibraryUrl = `https://openlibrary.org/search.json?author=${encodeURIComponent(cleanAuthor)}&limit=30`;
    const res = await fetch(openLibraryUrl);
    if (res.ok) {
      const data = await res.json();
      const docs: any[] = data.docs || [];
      const seenTitles = new Set<string>();
      const catalog: CatalogBook[] = [];

      docs.forEach((doc) => {
        const title: string = doc.title || '';
        const cleanTitle = title.trim().toLowerCase();
        if (cleanTitle && !seenTitles.has(cleanTitle) && !cleanTitle.includes('summary of') && !cleanTitle.includes('study guide')) {
          seenTitles.add(cleanTitle);
          const coverId = doc.cover_i;
          const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined;
          const isbn = Array.isArray(doc.isbn) && doc.isbn[0] ? doc.isbn[0] : undefined;

          catalog.push({
            title: doc.title,
            coverUrl,
            isbn,
            seriesVolumeNumber: extractVolumeNumber(doc.title) || undefined,
          });
        }
      });

      if (catalog.length > 0) {
        authorCache.set(cleanAuthor, catalog);
        return catalog;
      }
    }
  } catch (error) {
    console.warn('Error fetching Open Library author catalog:', error);
  }

  // 2. Fallback to Google Books API if Open Library yields no results
  try {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(cleanAuthor)}&maxResults=25`;
    const res = await fetch(googleBooksUrl);
    if (res.ok) {
      const data = await res.json();
      const items: any[] = data.items || [];
      const seenTitles = new Set<string>();
      const catalog: CatalogBook[] = [];

      items.forEach((item) => {
        const volumeInfo = item.volumeInfo || {};
        const title: string = volumeInfo.title || '';
        const cleanTitle = title.trim().toLowerCase();
        if (cleanTitle && !seenTitles.has(cleanTitle)) {
          seenTitles.add(cleanTitle);
          const coverUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
          catalog.push({
            title: volumeInfo.title,
            coverUrl,
          });
        }
      });

      authorCache.set(cleanAuthor, catalog);
      return catalog;
    }
  } catch (error) {
    console.warn('Error fetching Google Books author catalog:', error);
  }

  return [];
}

/**
 * Fetches all known volumes in a book series from Open Library.
 */
export async function fetchSeriesCatalog(seriesName: string): Promise<CatalogBook[]> {
  const cleanSeries = seriesName.trim();
  if (!cleanSeries) return [];
  if (seriesCache.has(cleanSeries)) {
    return seriesCache.get(cleanSeries)!;
  }

  try {
    const openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanSeries)}&limit=30`;
    const res = await fetch(openLibraryUrl);
    if (res.ok) {
      const data = await res.json();
      const docs: any[] = data.docs || [];
      const volumeMap = new Map<number, CatalogBook>();

      docs.forEach((doc) => {
        const title: string = doc.title || '';
        const volNum = extractVolumeNumber(title) || doc.series_number || null;
        if (volNum && volNum > 0 && !volumeMap.has(volNum)) {
          const coverId = doc.cover_i;
          const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined;
          volumeMap.set(volNum, {
            title,
            coverUrl,
            seriesVolumeNumber: volNum,
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
    console.warn('Error fetching Open Library series catalog:', error);
  }

  return [];
}

export interface CatalogBookDetails {
  title: string;
  authors: string[];
  description?: string;
  publishDate?: string;
  pageCount?: number;
  publisher?: string;
  coverUrl?: string;
  isbn?: string;
  seriesName?: string;
  seriesVolumeNumber?: number;
}

const detailsCache = new Map<string, CatalogBookDetails>();

/**
 * Fetches comprehensive metadata (publish date, blurb/synopsis, page count length, cover) for an unowned book.
 */
export async function fetchUnownedBookDetails(
  title: string,
  authorName?: string
): Promise<CatalogBookDetails> {
  const cacheKey = `${title.toLowerCase()}_${(authorName || '').toLowerCase()}`;
  if (detailsCache.has(cacheKey)) {
    return detailsCache.get(cacheKey)!;
  }

  // 1. Try Google Books API first for rich blurb, page count, and published date
  try {
    const query = `intitle:${encodeURIComponent(title)}${authorName ? `+inauthor:${encodeURIComponent(authorName)}` : ''}`;
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo || {};
        const description = volumeInfo.description
          ? volumeInfo.description.replace(/<[^>]*>?/gm, '') // Strip HTML tags
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
          authors: volumeInfo.authors || (authorName ? [authorName] : ['Unknown Author']),
          description,
          publishDate: volumeInfo.publishedDate,
          pageCount: volumeInfo.pageCount,
          publisher: volumeInfo.publisher,
          coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
          isbn: isbnObj?.identifier,
        };

        detailsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Error fetching Google Books detail:', err);
  }

  // 2. Fallback to Open Library Search API
  try {
    const openUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}${authorName ? `&author=${encodeURIComponent(authorName)}` : ''}&limit=1`;
    const res = await fetch(openUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.docs && data.docs.length > 0) {
        const doc = data.docs[0];
        const coverId = doc.cover_i;
        const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;

        const result: CatalogBookDetails = {
          title: doc.title || title,
          authors: doc.author_name || (authorName ? [authorName] : ['Unknown Author']),
          publishDate: doc.first_publish_year ? String(doc.first_publish_year) : doc.publish_date ? doc.publish_date[0] : undefined,
          pageCount: doc.number_of_pages_median || undefined,
          publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
          coverUrl,
          isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : undefined,
        };

        detailsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Error fetching Open Library detail:', err);
  }

  const fallback: CatalogBookDetails = {
    title,
    authors: authorName ? [authorName] : ['Unknown Author'],
  };
  detailsCache.set(cacheKey, fallback);
  return fallback;
}
