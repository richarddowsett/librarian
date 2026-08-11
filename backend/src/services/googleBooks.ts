import { SanitizedBookMetadata } from '../types';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedApiKey: string | null = null;

/**
 * Retrieves the Google Books API key securely from environment variable or AWS Secrets Manager.
 */
export async function getGoogleBooksApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    cachedApiKey = process.env.GOOGLE_BOOKS_API_KEY.trim();
    return cachedApiKey;
  }
  if (process.env.NODE_ENV === 'test') {
    return '';
  }

  try {
    const region = process.env.AWS_REGION || 'eu-central-1';
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: 'google-books-api-key' });
    const response = await client.send(command);

    if (response.SecretString) {
      try {
        const parsed = JSON.parse(response.SecretString);
        cachedApiKey = parsed.GOOGLE_BOOKS_API_KEY || parsed.api_key || response.SecretString;
      } catch {
        cachedApiKey = response.SecretString.trim();
      }
      return cachedApiKey || '';
    }
  } catch (err) {
    console.warn('SecretsManager lookup for google-books-api-key skipped/unresolved:', err);
  }

  return '';
}

export function sanitizeIsbn(isbn: string): string {
  if (!isbn) return '';
  return isbn.replace(/[-\s]/g, '').trim().toUpperCase();
}

export function isValidIsbnFormat(isbn: string): boolean {
  const sanitized = sanitizeIsbn(isbn);
  return /^(?:\d{9}[\dX]|\d{13})$/.test(sanitized);
}

/**
 * Fetches book metadata from the Google Books API by ISBN.
 */
export async function fetchBookByISBN(
  isbn: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SanitizedBookMetadata | null> {
  const cleanedIsbn = sanitizeIsbn(isbn);
  if (!cleanedIsbn || !isValidIsbnFormat(cleanedIsbn)) {
    return null;
  }

  try {
    const apiKey = await getGoogleBooksApiKey();
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedIsbn}${keyParam}`;

    const response = await fetchFn(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const volumeInfo = data.items[0].volumeInfo || {};

    const authors: string[] = Array.isArray(volumeInfo.authors) && volumeInfo.authors.length > 0
      ? volumeInfo.authors
      : ['Unknown Author'];

    const publisher: string = volumeInfo.publisher || 'Unknown Publisher';
    const publishDate: string = volumeInfo.publishedDate || 'Unknown';
    const pageCount: number = typeof volumeInfo.pageCount === 'number' ? volumeInfo.pageCount : 0;

    const description: string | null = volumeInfo.description
      ? volumeInfo.description.replace(/<[^>]*>?/gm, '').trim()
      : null;

    const coverUrl: string | null =
      volumeInfo.imageLinks?.extraLarge ||
      volumeInfo.imageLinks?.large ||
      volumeInfo.imageLinks?.medium ||
      volumeInfo.imageLinks?.thumbnail ||
      volumeInfo.imageLinks?.smallThumbnail ||
      null;

    const sanitizedCoverUrl = coverUrl ? coverUrl.replace(/^http:/, 'https:') : null;

    return {
      isbn: cleanedIsbn,
      title: volumeInfo.title || 'Untitled',
      subtitle: volumeInfo.subtitle || null,
      authors,
      coverUrl: sanitizedCoverUrl,
      publisher,
      publishDate,
      pageCount,
      description,
      categories: Array.isArray(volumeInfo.categories) ? volumeInfo.categories : null,
      language: volumeInfo.language || null,
      workKey: data.items[0].id || null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching Google Books metadata:', error);
    }
    return null;
  }
}

/**
/**
 * Helper to check if a book item is in English language and contains standard Latin script titles.
 */
export function isEnglishBookMetadata(volumeInfo: any): boolean {
  if (!volumeInfo) return false;
  const lang = (volumeInfo.language || '').trim().toLowerCase();
  if (lang && !lang.startsWith('en')) {
    return false;
  }
  const title = volumeInfo.title || '';
  // Check for non-Latin scripts (Cyrillic, CJK, Arabic, Hebrew, Greek)
  if (/[\u0400-\u04FF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0370-\u03FF]/.test(title)) {
    return false;
  }
  return true;
}

/**
 * Fetches author bibliography catalog items from Google Books API.
 */
export async function fetchAuthorCatalogFromGoogle(
  authorName: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<any[]> {
  const cleanAuthor = authorName.trim();
  if (!cleanAuthor) return [];

  try {
    const apiKey = await getGoogleBooksApiKey();
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(cleanAuthor)}&langRestrict=en&maxResults=40${keyParam}`;

    const response = await fetchFn(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) return [];

    const data = await response.json();
    const items: any[] = data.items || [];
    const seenTitles = new Set<string>();
    const catalog: any[] = [];

    items.forEach((item) => {
      const info = item.volumeInfo || {};
      if (!isEnglishBookMetadata(info)) {
        return;
      }

      const title: string = info.title || '';
      const cleanTitle = title.trim().toLowerCase();

      if (cleanTitle && !seenTitles.has(cleanTitle)) {
        seenTitles.add(cleanTitle);

        const coverUrl =
          info.imageLinks?.thumbnail ||
          info.imageLinks?.smallThumbnail;

        const isbnObj = Array.isArray(info.industryIdentifiers)
          ? info.industryIdentifiers.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')
          : undefined;

        catalog.push({
          title: info.title,
          subtitle: info.subtitle || undefined,
          authors: info.authors || [cleanAuthor],
          coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
          publisher: info.publisher,
          publishDate: info.publishedDate,
          pageCount: info.pageCount,
          description: info.description ? info.description.replace(/<[^>]*>?/gm, '') : undefined,
          categories: info.categories,
          language: info.language || 'en',
          isbn: isbnObj?.identifier,
        });
      }
    });

    return catalog;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching author catalog from Google Books:', err);
    }
    return [];
  }
}

/**
 * Fetches series catalog volumes from Google Books API.
 */
export async function fetchSeriesCatalogFromGoogle(
  seriesName: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<any[]> {
  const cleanSeries = seriesName.trim();
  if (!cleanSeries) return [];

  try {
    const apiKey = await getGoogleBooksApiKey();
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanSeries)}&langRestrict=en&maxResults=40${keyParam}`;

    const response = await fetchFn(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) return [];

    const data = await response.json();
    const items: any[] = data.items || [];
    const seenTitles = new Set<string>();
    const catalog: any[] = [];

    items.forEach((item) => {
      const info = item.volumeInfo || {};
      if (!isEnglishBookMetadata(info)) {
        return;
      }

      const title: string = info.title || '';
      const cleanTitle = title.trim().toLowerCase();

      if (cleanTitle && !seenTitles.has(cleanTitle)) {
        seenTitles.add(cleanTitle);

        const coverUrl =
          info.imageLinks?.thumbnail ||
          info.imageLinks?.smallThumbnail;

        catalog.push({
          title: info.title,
          coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
          publisher: info.publisher,
          publishDate: info.publishedDate,
          pageCount: info.pageCount,
          description: info.description ? info.description.replace(/<[^>]*>?/gm, '') : undefined,
          language: info.language || 'en',
        });
      }
    });

    return catalog;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching series catalog from Google Books:', err);
    }
    return [];
  }
}
