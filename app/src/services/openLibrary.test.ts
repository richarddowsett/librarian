import { fetchBookByISBN } from './openLibrary';
import { lookupIsbnApi } from './apiClient';

jest.mock('./apiClient', () => ({
  lookupIsbnApi: jest.fn(),
}));

describe('ISBN Lookup Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for empty ISBN', async () => {
    const result = await fetchBookByISBN('');
    expect(result).toBeNull();
  });

  it('parses valid backend API book payload', async () => {
    (lookupIsbnApi as jest.Mock).mockResolvedValueOnce({
      title: 'Harry Potter and the Deathly Hallows',
      authors: ['J.K. Rowling'],
      publisher: 'Scholastic',
      publishDate: '2007-07-21',
      pageCount: 759,
      description: 'The final battle for Hogwarts begins.',
      categories: ['Fiction / Fantasy'],
      coverUrl: 'https://books.google.com/books/content?id=123&printsec=frontcover&img=1',
    });

    const result = await fetchBookByISBN('978-0545010221');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Harry Potter and the Deathly Hallows');
    expect(result?.authors).toEqual(['J.K. Rowling']);
    expect(result?.publisher).toBe('Scholastic');
    expect(result?.pageCount).toBe(759);
    expect(result?.description).toBe('The final battle for Hogwarts begins.');
    expect(result?.coverUrl).toBe('https://books.google.com/books/content?id=123&printsec=frontcover&img=1');
  });

  it('returns null when book is not found', async () => {
    (lookupIsbnApi as jest.Mock).mockResolvedValueOnce(null);

    const result = await fetchBookByISBN('0000000000000');
    expect(result).toBeNull();
  });
});
