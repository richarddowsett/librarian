import { SanitizedBookMetadata, OpenLibraryListSummary, SeriesVolume } from '../types';
import { extractVolumeNumber, sanitizeWorkId } from './series';

/**
 * Sanitizes an ISBN string by stripping hyphens, spaces, and converting to uppercase.
 */
export function sanitizeIsbn(isbn: string): string {
  if (!isbn) return '';
  return isbn.replace(/[-\s]/g, '').trim().toUpperCase();
}

/**
 * Validates basic ISBN structure (10 or 13 alphanumeric characters).
 */
export function isValidIsbnFormat(isbn: string): boolean {
  const sanitized = sanitizeIsbn(isbn);
  return /^(?:\d{9}[\dX]|\d{13})$/.test(sanitized);
}

/**
 * Constructs the standard Open Library cover URL for a given ISBN.
 */
export function getCoverUrlByIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
  const sanitized = sanitizeIsbn(isbn);
  return `https://covers.openlibrary.org/b/isbn/${sanitized}-${size}.jpg`;
}

/**
 * Fetches book metadata from the Open Library Books API by ISBN.
 * Returns sanitized metadata or null if missing/failed.
 */
export async function fetchBookByISBN(
  isbn: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SanitizedBookMetadata | null> {
  const cleanedIsbn = sanitizeIsbn(isbn);
  if (!cleanedIsbn || !isValidIsbnFormat(cleanedIsbn)) {
    return null;
  }

  const bibKey = `ISBN:${cleanedIsbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${bibKey}&jscmd=data&format=json`;

  try {
    const response = await fetchFn(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0 (https://github.com/librarian-app)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawBook = data[bibKey];

    if (!rawBook) {
      return null;
    }

    // Extract authors array
    let authors: string[] = ['Unknown Author'];
    if (Array.isArray(rawBook.authors) && rawBook.authors.length > 0) {
      authors = rawBook.authors
        .map((a: any) => (typeof a === 'string' ? a : a.name))
        .filter((name: any): name is string => typeof name === 'string' && name.trim().length > 0);
      if (authors.length === 0) authors = ['Unknown Author'];
    }

    // Extract publisher string
    let publisher = 'Unknown Publisher';
    if (Array.isArray(rawBook.publishers) && rawBook.publishers.length > 0) {
      const pubNames = rawBook.publishers
        .map((p: any) => (typeof p === 'string' ? p : p.name))
        .filter((name: any): name is string => typeof name === 'string' && name.trim().length > 0);
      if (pubNames.length > 0) {
        publisher = pubNames.join(', ');
      }
    } else if (typeof rawBook.publisher === 'string') {
      publisher = rawBook.publisher;
    }

    // Cover image fallback
    let coverUrl: string | null = null;
    if (rawBook.cover) {
      coverUrl = rawBook.cover.large || rawBook.cover.medium || rawBook.cover.small || null;
    }
    // If cover URL is still missing, fallback to Open Library default cover generator or null
    if (!coverUrl) {
      coverUrl = getCoverUrlByIsbn(cleanedIsbn, 'L');
    }

    // Extract work key (e.g. "/works/OL82563W" -> "OL82563W" or "/works/OL82563W")
    let workKey: string | null = null;
    if (Array.isArray(rawBook.works) && rawBook.works.length > 0 && rawBook.works[0].key) {
      const fullKey: string = rawBook.works[0].key;
      workKey = fullKey.startsWith('/works/') ? fullKey.replace('/works/', '') : fullKey;
    }

    return {
      isbn: cleanedIsbn,
      title: rawBook.title || 'Untitled',
      authors,
      coverUrl,
      publisher,
      publishDate: rawBook.publish_date || 'Unknown',
      pageCount: typeof rawBook.number_of_pages === 'number' ? rawBook.number_of_pages : 0,
      workKey,
    };
  } catch (error) {
    // Graceful error recovery on network error, JSON parse error, etc.
    return null;
  }
}

/**
 * Searches Open Library API by title and optional author.
 */
export async function searchBooksByTitleAndAuthor(
  title: string,
  author?: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SanitizedBookMetadata[]> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return [];

  try {
    let url = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}`;
    if (author && author.trim()) {
      url += `&author=${encodeURIComponent(author.trim())}`;
    }
    url += '&limit=5';

    const response = await fetchFn(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0 (https://github.com/librarian-app)',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.docs || !Array.isArray(data.docs)) return [];

    const results: SanitizedBookMetadata[] = [];
    for (const doc of data.docs) {
      let isbn = '';
      if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
        const validIsbn = doc.isbn.find((i: string) => isValidIsbnFormat(i));
        if (validIsbn) isbn = sanitizeIsbn(validIsbn);
      }

      let coverUrl: string | null = null;
      if (doc.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      } else if (isbn) {
        coverUrl = getCoverUrlByIsbn(isbn, 'L');
      }

      let workKey: string | null = null;
      if (doc.key) {
        workKey = doc.key.startsWith('/works/') ? doc.key.replace('/works/', '') : doc.key;
      }

      const authors = Array.isArray(doc.author_name) && doc.author_name.length > 0
        ? doc.author_name
        : author ? [author] : ['Unknown Author'];

      const publisher = Array.isArray(doc.publisher) && doc.publisher.length > 0
        ? doc.publisher[0]
        : 'Unknown Publisher';

      const publishDate = Array.isArray(doc.publish_date) && doc.publish_date.length > 0
        ? doc.publish_date[0]
        : doc.first_publish_year ? String(doc.first_publish_year) : 'Unknown';

      results.push({
        isbn,
        title: doc.title || cleanTitle,
        subtitle: doc.subtitle || null,
        authors,
        coverUrl,
        publisher,
        publishDate,
        pageCount: typeof doc.number_of_pages_median === 'number' ? doc.number_of_pages_median : 0,
        description: typeof doc.first_sentence === 'string' ? doc.first_sentence : null,
        categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : null,
        language: Array.isArray(doc.language) && doc.language.length > 0 ? doc.language[0] : 'en',
        workKey,
      });
    }

    return results;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error searching Open Library by title and author:', err);
    }
    return [];
  }
}

/**
 * Resolves an Open Library work ID (e.g. OL82563W) from an ISBN string.
 * Tries bibkeys API, direct ISBN edition JSON, and search API.
 */
export async function resolveWorkIdFromIsbn(
  isbn: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<string | null> {
  const cleanedIsbn = sanitizeIsbn(isbn);
  if (!cleanedIsbn || !isValidIsbnFormat(cleanedIsbn)) return null;

  // 1. Try bibkeys API
  try {
    const bibKey = `ISBN:${cleanedIsbn}`;
    const url = `https://openlibrary.org/api/books?bibkeys=${bibKey}&jscmd=data&format=json`;
    const response = await fetchFn(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const rawBook = data[bibKey];
      if (rawBook && Array.isArray(rawBook.works) && rawBook.works.length > 0 && rawBook.works[0].key) {
        const fullKey: string = rawBook.works[0].key;
        return fullKey.replace(/^\/works\//, '').trim();
      }
    }
  } catch (error) {
    // Ignore bibkeys error
  }

  // 2. Try direct ISBN edition JSON endpoint
  try {
    const isbnUrl = `https://openlibrary.org/isbn/${cleanedIsbn}.json`;
    const response = await fetchFn(isbnUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.works) && data.works.length > 0 && data.works[0].key) {
        const fullKey: string = data.works[0].key;
        return fullKey.replace(/^\/works\//, '').trim();
      }
    }
  } catch (error) {
    // Ignore edition error
  }

  // 3. Try Open Library search API by ISBN
  try {
    const searchUrl = `https://openlibrary.org/search.json?isbn=${cleanedIsbn}`;
    const response = await fetchFn(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.docs) && data.docs.length > 0) {
        const doc = data.docs[0];
        if (doc.key && typeof doc.key === 'string' && doc.key.includes('/works/')) {
          return doc.key.replace(/^\/works\//, '').trim();
        }
        if (Array.isArray(doc.work_key) && doc.work_key.length > 0) {
          return String(doc.work_key[0]).replace(/^\/works\//, '').trim();
        }
      }
    }
  } catch (error) {
    // Ignore search error
  }

  return null;
}

/**
 * Fetches top 3 user-created lists for a given Open Library work ID or ISBN.
 * Lists are sorted by seed count (number of books included).
 */
export async function fetchTopListsForWork(
  workIdOrIsbn: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<OpenLibraryListSummary[]> {
  let cleanId = sanitizeWorkId(workIdOrIsbn);
  if (!cleanId) return [];

  // If parameter is an ISBN format, auto-resolve the workId first!
  if (isValidIsbnFormat(cleanId)) {
    const resolvedId = await resolveWorkIdFromIsbn(cleanId, fetchFn);
    if (resolvedId) {
      cleanId = resolvedId;
    }
  }

  const url = `https://openlibrary.org/works/${cleanId}/lists.json`;

  try {
    const response = await fetchFn(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.entries || !Array.isArray(data.entries)) return [];

    const lists: OpenLibraryListSummary[] = data.entries.map((item: any) => ({
      url: item.url || item.full_url || '',
      fullUrl: item.full_url || item.url || '',
      name: (item.name || 'Untitled List').trim(),
      seedCount: typeof item.seed_count === 'number' ? item.seed_count : 0,
      lastUpdate: item.last_update || undefined,
    }));

    // Prioritize lists with valid seedCount > 0 and sort by seedCount descending
    const sorted = lists.sort((a, b) => b.seedCount - a.seedCount);

    return sorted.slice(0, 3);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching Open Library lists for work:', error);
    }
    return [];
  }
}

/**
 * Fetches volume list seeds from an Open Library list endpoint.
 */
export async function fetchOpenLibraryListSeeds(
  listPath: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SeriesVolume[]> {
  if (!listPath) return [];

  let cleanPath = listPath.trim();
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    } catch (e) {
      // keep original if URL parse fails
    }
  }

  // Ensure seeds.json endpoint formatting
  cleanPath = cleanPath.replace(/\/seeds(?:\.json)?$/, '').replace(/\.json$/, '');
  const seedsUrl = `https://openlibrary.org${cleanPath}/seeds.json`;

  try {
    const response = await fetchFn(seedsUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.entries || !Array.isArray(data.entries)) return [];

    const volumes: SeriesVolume[] = [];
    data.entries.forEach((entry: any, index: number) => {
      const title = entry.title || `Volume ${index + 1}`;
      const volNum = extractVolumeNumber(title) || index + 1;

      let workId: string | null = null;
      const rawUrl = entry.url || entry.full_url || entry.key || '';
      if (rawUrl.includes('/works/')) {
        const match = rawUrl.match(/\/works\/([^\/\s]+)/);
        if (match) workId = match[1];
      } else if (/^OL\d+W$/i.test(rawUrl.trim())) {
        workId = rawUrl.trim();
      }

      let coverUrl: string | null = null;
      if (entry.picture && entry.picture.url) {
        let picUrl: string = entry.picture.url;
        if (picUrl.startsWith('//')) {
          picUrl = `https:${picUrl}`;
        }
        coverUrl = picUrl;
      } else if (entry.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${entry.cover_i}-L.jpg`;
      } else if (Array.isArray(entry.covers) && entry.covers.length > 0 && entry.covers[0] > 0) {
        coverUrl = `https://covers.openlibrary.org/b/id/${entry.covers[0]}-L.jpg`;
      } else if (workId) {
        coverUrl = `https://covers.openlibrary.org/b/id/${workId}-L.jpg`;
      }

      let authorsList: string[] = [];
      if (Array.isArray(entry.author_name) && entry.author_name.length > 0) {
        authorsList = entry.author_name.map((a: any) => (typeof a === 'string' ? a : a.name || '')).filter(Boolean);
      } else if (Array.isArray(entry.author_names) && entry.author_names.length > 0) {
        authorsList = entry.author_names.map((a: any) => (typeof a === 'string' ? a : a.name || '')).filter(Boolean);
      } else if (Array.isArray(entry.authors) && entry.authors.length > 0) {
        authorsList = entry.authors.map((a: any) => (typeof a === 'string' ? a : a.name || '')).filter(Boolean);
      } else if (typeof entry.by_statement === 'string' && entry.by_statement.trim()) {
        authorsList = [entry.by_statement.replace(/^by\s+/i, '').trim()];
      }

      volumes.push({
        volumeNumber: volNum,
        title,
        authors: authorsList.length > 0 ? authorsList : null,
        workId,
        coverUrl,
      });
    });

    return volumes;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching Open Library list seeds:', error);
    }
    return [];
  }
}

