import { isEnglishCatalogBook, fetchAuthorCatalog } from './catalogService';

describe('catalogService', () => {
  describe('isEnglishCatalogBook', () => {
    it('returns true for English books', () => {
      expect(isEnglishCatalogBook({ title: 'The Great Gatsby', language: 'en' })).toBe(true);
      expect(isEnglishCatalogBook({ title: 'Harry Potter', language: 'en-US' })).toBe(true);
      expect(isEnglishCatalogBook({ title: 'The Hobbit', language: 'en-GB' })).toBe(true);
      expect(isEnglishCatalogBook({ title: 'Dune' })).toBe(true);
    });

    it('returns false for non-English languages', () => {
      expect(isEnglishCatalogBook({ title: 'El Aleph', language: 'es' })).toBe(false);
      expect(isEnglishCatalogBook({ title: 'Le Petit Prince', language: 'fr' })).toBe(false);
      expect(isEnglishCatalogBook({ title: 'Der Process', language: 'de' })).toBe(false);
      expect(isEnglishCatalogBook({ title: 'Norwegian Wood', language: 'ja' })).toBe(false);
    });

    it('returns false for non-Latin script titles', () => {
      expect(isEnglishCatalogBook({ title: 'Сияние' })).toBe(false);
      expect(isEnglishCatalogBook({ title: 'ノルウェイの森' })).toBe(false);
      expect(isEnglishCatalogBook({ title: '三体' })).toBe(false);
    });
  });

  describe('fetchAuthorCatalog API query', () => {
    it('includes langRestrict=en in fallback Google Books search URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              volumeInfo: {
                title: 'Clean Code',
                language: 'en',
                industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780132350884' }],
              },
            },
            {
              volumeInfo: {
                title: 'Código Limpio (Spanish Edition)',
                language: 'es',
              },
            },
          ],
        }),
      });

      global.fetch = mockFetch as any;

      const result = await fetchAuthorCatalog('Robert C. Martin');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('langRestrict=en')
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Clean Code');
    });
  });
});
