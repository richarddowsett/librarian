import { Book } from '../schemas/book';

export interface OpenLibraryBookResult {
  isbn: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  publisher?: string;
  publishDate?: string;
  pageCount?: number;
  seriesName?: string;
  seriesVolumeNumber?: number;
}

export async function fetchBookByISBN(isbn: string): Promise<OpenLibraryBookResult | null> {
  const sanitizedIsbn = isbn.replace(/[- ]/g, '').trim();
  if (!sanitizedIsbn) return null;

  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${sanitizedIsbn}&jscmd=data&format=json`
    );

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }

    const data = await response.json();
    const key = `ISBN:${sanitizedIsbn}`;
    const rawBook = data[key];

    if (!rawBook) {
      return null;
    }

    const authors = Array.isArray(rawBook.authors)
      ? rawBook.authors.map((a: any) => a.name)
      : ['Unknown Author'];

    const publisher = Array.isArray(rawBook.publishers) && rawBook.publishers[0]
      ? rawBook.publishers[0].name
      : undefined;

    const coverUrl = rawBook.cover?.large || rawBook.cover?.medium || rawBook.cover?.small || undefined;

    return {
      isbn: sanitizedIsbn,
      title: rawBook.title || 'Untitled',
      authors,
      coverUrl,
      publisher,
      publishDate: rawBook.publish_date,
      pageCount: rawBook.number_of_pages,
    };
  } catch (error) {
    console.error('Error fetching book from Open Library:', error);
    throw error;
  }
}
