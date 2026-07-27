import { fetchBookByISBN } from './openLibrary';

describe('Open Library Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn();
  });

  it('returns null for empty ISBN', async () => {
    const result = await fetchBookByISBN('');
    expect(result).toBeNull();
  });

  it('parses valid Open Library API book data', async () => {
    const mockApiResponse = {
      'ISBN:9780545010221': {
        title: 'Harry Potter and the Deathly Hallows',
        authors: [{ name: 'J.K. Rowling' }],
        publishers: [{ name: 'Scholastic' }],
        publish_date: 'July 21, 2007',
        number_of_pages: 759,
        cover: { large: 'https://covers.openlibrary.org/b/id/123-L.jpg' },
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockApiResponse),
    });

    const result = await fetchBookByISBN('978-0545010221');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Harry Potter and the Deathly Hallows');
    expect(result?.authors).toEqual(['J.K. Rowling']);
    expect(result?.publisher).toBe('Scholastic');
    expect(result?.pageCount).toBe(759);
    expect(result?.coverUrl).toBe('https://covers.openlibrary.org/b/id/123-L.jpg');
  });

  it('returns null when book is not found in Open Library payload', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({}),
    });

    const result = await fetchBookByISBN('0000000000000');
    expect(result).toBeNull();
  });

  it('throws an error when HTTP response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchBookByISBN('9780545010221')).rejects.toThrow('Open Library API error: 500');
  });
});
