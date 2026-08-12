import { resolveCandidateBooks } from '../bookSearchService';
import * as googleBooksModule from '../googleBooks';
import * as openLibraryModule from '../openLibrary';

describe('Book Search Service (resolveCandidateBooks)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an empty array when extractedBooks is empty', async () => {
    const results = await resolveCandidateBooks([]);
    expect(results).toEqual([]);
  });

  it('queries Google Books and Open Library concurrently and deduplicates results', async () => {
    const extractedBooks = [
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', confidence: 0.95 },
    ];

    const googleBook = {
      isbn: '9780261102217',
      title: 'The Hobbit',
      subtitle: null,
      authors: ['J.R.R. Tolkien'],
      coverUrl: 'https://books.google.com/cover.jpg',
      publisher: 'HarperCollins',
      publishDate: '1937',
      pageCount: 310,
      description: 'A hobbit goes on a journey.',
      categories: ['Fantasy'],
      language: 'en',
      workKey: 'g123',
    };

    const duplicateOlBook = {
      isbn: '9780261102217',
      title: 'The Hobbit',
      authors: ['J.R.R. Tolkien'],
      coverUrl: 'https://covers.openlibrary.org/cover.jpg',
      publisher: 'Allen & Unwin',
      publishDate: '1937',
      pageCount: 310,
      workKey: 'OL123W',
    };

    const uniqueOlBook = {
      isbn: '9780007458424',
      title: 'The Hobbit: Illustrated Edition',
      authors: ['J.R.R. Tolkien'],
      coverUrl: 'https://covers.openlibrary.org/cover2.jpg',
      publisher: 'HarperCollins',
      publishDate: '2011',
      pageCount: 320,
      workKey: 'OL456W',
    };

    jest.spyOn(googleBooksModule, 'searchBooksByTitleAndAuthor').mockResolvedValue([googleBook]);
    jest.spyOn(openLibraryModule, 'searchBooksByTitleAndAuthor').mockResolvedValue([duplicateOlBook, uniqueOlBook]);

    const mockFetch = jest.fn();
    const results = await resolveCandidateBooks(extractedBooks, { fetchFn: mockFetch });

    expect(googleBooksModule.searchBooksByTitleAndAuthor).toHaveBeenCalledWith(
      'The Hobbit',
      'J.R.R. Tolkien',
      mockFetch
    );
    expect(openLibraryModule.searchBooksByTitleAndAuthor).toHaveBeenCalledWith(
      'The Hobbit',
      'J.R.R. Tolkien',
      mockFetch
    );

    // Duplicate ISBN '9780261102217' should be removed, leaving 2 unique candidates
    expect(results).toHaveLength(2);
    expect(results[0].isbn).toBe('9780261102217');
    expect(results[1].isbn).toBe('9780007458424');
  });
});
