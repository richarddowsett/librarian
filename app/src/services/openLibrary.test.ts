import { fetchBookByISBN } from './openLibrary';

describe('Google Books ISBN Lookup Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn();
  });

  it('returns null for empty ISBN', async () => {
    const result = await fetchBookByISBN('');
    expect(result).toBeNull();
  });

  it('parses valid Google Books API book payload', async () => {
    const mockGoogleResponse = {
      items: [
        {
          volumeInfo: {
            title: 'Harry Potter and the Deathly Hallows',
            authors: ['J.K. Rowling'],
            publisher: 'Scholastic',
            publishedDate: '2007-07-21',
            pageCount: 759,
            description: 'The final battle for Hogwarts begins.',
            categories: ['Fiction / Fantasy'],
            imageLinks: {
              thumbnail: 'http://books.google.com/books/content?id=123&printsec=frontcover&img=1',
            },
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockGoogleResponse),
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

  it('returns null when book is not found in payload', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ items: [] }),
    });

    const result = await fetchBookByISBN('0000000000000');
    expect(result).toBeNull();
  });

  it('throws an error when HTTP response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchBookByISBN('9780545010221')).rejects.toThrow('Google Books API error: 500');
  });
});
