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
