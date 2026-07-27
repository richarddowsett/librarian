import {
  fetchBookByISBN,
  getCoverUrlByIsbn,
  isValidIsbnFormat,
  sanitizeIsbn,
} from '../openLibrary';

describe('Open Library API Service', () => {
  describe('sanitizeIsbn', () => {
    it('strips hyphens, spaces, and converts to uppercase', () => {
      expect(sanitizeIsbn('978-0-545-01022-1')).toBe('9780545010221');
      expect(sanitizeIsbn(' 0 545 01022 X ')).toBe('054501022X');
      expect(sanitizeIsbn('')).toBe('');
    });
  });

  describe('isValidIsbnFormat', () => {
    it('validates 10-digit and 13-digit ISBNs', () => {
      expect(isValidIsbnFormat('9780545010221')).toBe(true);
      expect(isValidIsbnFormat('054501022X')).toBe(true);
      expect(isValidIsbnFormat('12345')).toBe(false);
      expect(isValidIsbnFormat('INVALID_ISBN')).toBe(false);
    });
  });

  describe('getCoverUrlByIsbn', () => {
    it('constructs cover URL for specified size', () => {
      expect(getCoverUrlByIsbn('9780545010221', 'L')).toBe(
        'https://covers.openlibrary.org/b/isbn/9780545010221-L.jpg'
      );
      expect(getCoverUrlByIsbn('978-0-545-01022-1', 'M')).toBe(
        'https://covers.openlibrary.org/b/isbn/9780545010221-M.jpg'
      );
    });
  });

  describe('fetchBookByISBN', () => {
    const validIsbn = '9780545010221';
    const bibKey = `ISBN:${validIsbn}`;

    it('returns sanitized book metadata on successful API response', async () => {
      const mockApiResponse = {
        [bibKey]: {
          title: 'Harry Potter and the Deathly Hallows',
          authors: [{ name: 'J. K. Rowling' }],
          publishers: [{ name: 'Arthur A. Levine Books' }],
          publish_date: 'July 21, 2007',
          number_of_pages: 759,
          cover: {
            large: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
          },
          works: [{ key: '/works/OL82563W' }],
        },
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await fetchBookByISBN(validIsbn, mockFetch as any);

      expect(result).not.toBeNull();
      expect(result).toEqual({
        isbn: validIsbn,
        title: 'Harry Potter and the Deathly Hallows',
        authors: ['J. K. Rowling'],
        publisher: 'Arthur A. Levine Books',
        publishDate: 'July 21, 2007',
        pageCount: 759,
        coverUrl: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
        workKey: 'OL82563W',
      });
    });

    it('returns null if ISBN is invalid', async () => {
      const mockFetch = jest.fn();
      const result = await fetchBookByISBN('invalid-isbn', mockFetch as any);
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null if Open Library API returns 404', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).toBeNull();
    });

    it('returns null if book entry is missing in Open Library response object', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).toBeNull();
    });

    it('falls back gracefully when cover URL object is missing', async () => {
      const mockApiResponse = {
        [bibKey]: {
          title: 'Unknown Harry Potter',
          authors: [{ name: 'J. K. Rowling' }],
          publishers: [{ name: 'Scholastic' }],
          publish_date: '2007',
          number_of_pages: 500,
        },
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).not.toBeNull();
      expect(result?.coverUrl).toBe(
        `https://covers.openlibrary.org/b/isbn/${validIsbn}-L.jpg`
      );
    });

    it('handles network throw exception gracefully returning null', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).toBeNull();
    });
  });
});
