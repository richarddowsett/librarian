import { isEnglishCatalogBook, fetchAuthorCatalog } from './catalogService';
import { fetchAuthorCatalogApi } from './apiClient';

jest.mock('./apiClient', () => ({
  fetchAuthorCatalogApi: jest.fn(),
  fetchSeriesCatalogApi: jest.fn(),
  searchBooksApi: jest.fn(),
}));

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
    it('fetches author catalog from backend API service', async () => {
      (fetchAuthorCatalogApi as jest.Mock).mockResolvedValueOnce([
        {
          title: 'Clean Code',
          language: 'en',
          isbn: '9780132350884',
        },
        {
          title: 'Código Limpio (Spanish Edition)',
          language: 'es',
        },
      ]);

      const result = await fetchAuthorCatalog('Robert C. Martin');

      expect(fetchAuthorCatalogApi).toHaveBeenCalledWith('Robert C. Martin');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Clean Code');
    });
  });
});
