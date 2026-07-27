import { SanitizedBookMetadata } from '../types';

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
