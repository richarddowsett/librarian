import {
  fetchBookByISBN,
  isValidIsbnFormat,
  sanitizeIsbn,
} from '../googleBooks';

describe('Google Books API Service', () => {
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

  describe('fetchBookByISBN', () => {
    const validIsbn = '9780545010221';

    it('returns sanitized book metadata on successful Google Books API response', async () => {
      const mockApiResponse = {
        items: [
          {
            id: 'google-volume-id-123',
            volumeInfo: {
              title: 'Harry Potter and the Deathly Hallows',
              subtitle: 'The Final Chapter',
              authors: ['J.K. Rowling'],
              publisher: 'Scholastic',
              publishedDate: '2007-07-21',
              pageCount: 759,
              description: 'The epic finale.',
              categories: ['Fiction / Fantasy'],
              language: 'en',
              imageLinks: {
                thumbnail: 'http://books.google.com/content/cover.jpg',
              },
            },
          },
        ],
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
        subtitle: 'The Final Chapter',
        authors: ['J.K. Rowling'],
        publisher: 'Scholastic',
        publishDate: '2007-07-21',
        pageCount: 759,
        description: 'The epic finale.',
        categories: ['Fiction / Fantasy'],
        language: 'en',
        coverUrl: 'https://books.google.com/content/cover.jpg',
        workKey: 'google-volume-id-123',
      });
    });

    it('returns null if ISBN is invalid', async () => {
      const mockFetch = jest.fn();
      const result = await fetchBookByISBN('invalid-isbn', mockFetch as any);
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null if Google Books API returns 404 or empty items array', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).toBeNull();
    });

    it('handles network throw exception gracefully returning null', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await fetchBookByISBN(validIsbn, mockFetch as any);
      expect(result).toBeNull();
    });
  });

  describe('isEnglishBookMetadata & fetchAuthorCatalogFromGoogle', () => {
    it('filters out non-English languages and non-Latin script titles', async () => {
      const mockApiResponse = {
        items: [
          {
            volumeInfo: {
              title: 'The Shining',
              authors: ['Stephen King'],
              language: 'en',
            },
          },
          {
            volumeInfo: {
              title: 'Shining (Spanish Edition)',
              authors: ['Stephen King'],
              language: 'es',
            },
          },
          {
            volumeInfo: {
              title: 'Сияние',
              authors: ['Стивен Кинг'],
              language: 'en',
            },
          },
        ],
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const catalog = await (require('../googleBooks').fetchAuthorCatalogFromGoogle)('Stephen King', mockFetch as any);

      expect(catalog).toHaveLength(1);
      expect(catalog[0].title).toBe('The Shining');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('langRestrict=en'),
        expect.anything()
      );
    });
  });
});
