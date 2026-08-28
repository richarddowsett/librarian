import { lookupIsbnApi } from './apiClient';

export interface GoogleBookResult {
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

export async function fetchBookByISBN(isbn: string): Promise<GoogleBookResult | null> {
  const sanitizedIsbn = isbn.replace(/[- ]/g, '').trim();
  if (!sanitizedIsbn) return null;

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
    console.error('Error looking up book via backend API:', error);
  }

  return null;
}
