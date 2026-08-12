import { SanitizedBookMetadata, ExtractedBook } from '../types';
import { searchBooksByTitleAndAuthor as searchGoogle } from './googleBooks';
import { searchBooksByTitleAndAuthor as searchOpenLibrary } from './openLibrary';

export interface BookSearchOptions {
  fetchFn?: typeof fetch;
}

/**
 * Takes extracted book titles & authors from Bedrock and concurrently queries Google Books API
 * and OpenLibrary API to retrieve verified candidate book metadata.
 */
export async function resolveCandidateBooks(
  extractedBooks: ExtractedBook[],
  options: BookSearchOptions = {}
): Promise<SanitizedBookMetadata[]> {
  if (!extractedBooks || extractedBooks.length === 0) {
    return [];
  }

  const fetchFn = options.fetchFn || globalThis.fetch;

  const searchPromises = extractedBooks.map(async (book) => {
    if (!book.title || !book.title.trim()) return [];

    const [googleResults, olResults] = await Promise.all([
      searchGoogle(book.title, book.author, fetchFn),
      searchOpenLibrary(book.title, book.author, fetchFn),
    ]);

    return [...googleResults, ...olResults];
  });

  const rawResults = await Promise.all(searchPromises);
  const flattened = rawResults.flat();

  const seenIsbns = new Set<string>();
  const seenTitleAuthors = new Set<string>();
  const candidates: SanitizedBookMetadata[] = [];

  for (const book of flattened) {
    const cleanIsbn = book.isbn ? book.isbn.trim().toUpperCase() : '';
    const cleanTitle = book.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const cleanAuthor = (book.authors[0] || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const titleAuthorKey = `${cleanTitle}:${cleanAuthor}`;

    if (cleanIsbn && seenIsbns.has(cleanIsbn)) {
      continue;
    }
    if (seenTitleAuthors.has(titleAuthorKey)) {
      continue;
    }

    if (cleanIsbn) {
      seenIsbns.add(cleanIsbn);
    }
    if (cleanTitle) {
      seenTitleAuthors.add(titleAuthorKey);
    }

    candidates.push(book);
  }

  return candidates;
}
