import { lookupIsbnApi } from './apiClient';

export interface OpenLibraryBookResult {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  coverUrl?: string;
  publisher?: string;
  publishDate?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  language?: string;
  seriesName?: string;
  seriesVolumeNumber?: number;
}

export async function fetchBookByISBN(isbn: string): Promise<OpenLibraryBookResult | null> {
  const sanitizedIsbn = isbn.replace(/[- ]/g, '').trim();
  if (!sanitizedIsbn) return null;

  if (process.env.NODE_ENV !== 'test') {
    try {
      const remoteBook = await lookupIsbnApi(sanitizedIsbn);
      if (remoteBook) {
        return {
          isbn: sanitizedIsbn,
          title: remoteBook.title || 'Untitled',
          subtitle: remoteBook.subtitle || undefined,
          authors: remoteBook.authors || ['Unknown Author'],
          coverUrl: remoteBook.coverUrl || undefined,
          publisher: remoteBook.publisher || undefined,
          publishDate: remoteBook.publishDate || undefined,
          pageCount: remoteBook.pageCount || undefined,
          description: remoteBook.description || undefined,
          categories: remoteBook.categories || undefined,
          language: remoteBook.language || undefined,
        };
      }
    } catch (error) {
      // Proceed to direct query fallback
    }
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${sanitizedIsbn}`
    );

    if (!response || !response.ok) {
      throw new Error(`Google Books API error: ${response?.status || 'Unknown'}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const volumeInfo = data.items[0].volumeInfo || {};
    const authors = Array.isArray(volumeInfo.authors) ? volumeInfo.authors : ['Unknown Author'];
    const coverUrl = volumeInfo.imageLinks?.extraLarge || volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.thumbnail;

    return {
      isbn: sanitizedIsbn,
      title: volumeInfo.title || 'Untitled',
      subtitle: volumeInfo.subtitle || undefined,
      authors,
      coverUrl: coverUrl ? coverUrl.replace(/^http:/, 'https:') : undefined,
      publisher: volumeInfo.publisher,
      publishDate: volumeInfo.publishedDate,
      pageCount: volumeInfo.pageCount,
      description: volumeInfo.description ? volumeInfo.description.replace(/<[^>]*>?/gm, '') : undefined,
      categories: volumeInfo.categories,
      language: volumeInfo.language,
    };
  } catch (error) {
    console.error('Error fetching book from Google Books:', error);
    throw error;
  }
}
