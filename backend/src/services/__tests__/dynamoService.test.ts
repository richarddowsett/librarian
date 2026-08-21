import {
  addBookForUser,
  getBooksByOwner,
  getBookById,
  updateBook,
  deleteBook,
  getUserById,
  putUser,
  findCatalogBookByIsbn,
  getCatalogBookById,
  ensureCatalogBookWorkKey,
  backfillBooksTableWorkKeys,
} from '../dynamoService';

// Mock AWS DynamoDB DocumentClient & Commands
const mockSend = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: () => ({
        send: (command: any) => mockSend(command),
      }),
    },
    QueryCommand: jest.fn().mockImplementation((input) => ({ type: 'QueryCommand', input })),
    GetCommand: jest.fn().mockImplementation((input) => ({ type: 'GetCommand', input })),
    PutCommand: jest.fn().mockImplementation((input) => ({ type: 'PutCommand', input })),
    DeleteCommand: jest.fn().mockImplementation((input) => ({ type: 'DeleteCommand', input })),
    ScanCommand: jest.fn().mockImplementation((input) => ({ type: 'ScanCommand', input })),
  };
});

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

// Mock googleBooks fetcher
jest.mock('../googleBooks', () => ({
  fetchBookByISBN: jest.fn(),
}));

// Mock openLibrary fetcher
jest.mock('../openLibrary', () => ({
  resolveWorkIdFromIsbn: jest.fn().mockResolvedValue('OL99999W'),
  fetchBookByISBN: jest.fn().mockResolvedValue({ workKey: 'OL99999W' }),
}));

import { fetchBookByISBN } from '../googleBooks';
import { resolveWorkIdFromIsbn } from '../openLibrary';

describe('DynamoDB Normalized 3-Table Service (Users, Books Catalog, User Library)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addBookForUser & Deduplication', () => {
    it('checks DynamoDB books catalog by ISBN first before calling Google Books API', async () => {
      const existingCatalogBook = {
        id: 'shared-catalog-uuid-1',
        isbn: '9780545010221',
        title: 'Harry Potter and the Deathly Hallows',
        authors: ['J.K. Rowling'],
        coverUrl: 'https://example.com/hp7.jpg',
        publisher: 'Scholastic',
        publishDate: '2007',
        pageCount: 759,
        createdAt: '2026-07-31T00:00:00.000Z',
      };

      // 1. QueryCommand on books table isbn-index -> found!
      mockSend.mockResolvedValueOnce({ Items: [existingCatalogBook] });
      // 2. PutCommand on user_library table
      mockSend.mockResolvedValueOnce({});

      const result = await addBookForUser('user-1', {
        isbn: '9780545010221',
        title: 'Harry Potter 7',
        readStatus: 'read',
      });

      // Assert Google Books API was NOT called!
      expect(fetchBookByISBN).not.toHaveBeenCalled();

      expect(result.ownerId).toBe('user-1');
      expect(result.bookId).toBe('shared-catalog-uuid-1');
      expect(result.isbn).toBe('9780545010221');
      expect(result.title).toBe('Harry Potter and the Deathly Hallows');
    });

    it('fetches metadata from Google Books API and creates catalog item if ISBN is missing from DB', async () => {
      // 1. QueryCommand on books table isbn-index -> empty
      mockSend.mockResolvedValueOnce({ Items: [] });

      // Mock Google Books API response
      (fetchBookByISBN as jest.Mock).mockResolvedValueOnce({
        isbn: '9780140449136',
        title: 'The Odyssey',
        subtitle: 'An Epic Poem',
        authors: ['Homer'],
        coverUrl: 'https://example.com/odyssey.jpg',
        publisher: 'Penguin Classics',
        publishDate: '2003',
        pageCount: 544,
        description: 'Classic epic story',
        categories: ['Classics', 'Poetry'],
        language: 'en',
        workKey: 'OL12345W',
      });

      // 2. PutCommand on books catalog table
      mockSend.mockResolvedValueOnce({});
      // 3. PutCommand on user_library table
      mockSend.mockResolvedValueOnce({});

      const result = await addBookForUser('user-2', {
        isbn: '9780140449136',
      });

      expect(fetchBookByISBN).toHaveBeenCalledWith('9780140449136');
      expect(result.ownerId).toBe('user-2');
      expect(result.title).toBe('The Odyssey');
      expect(result.publisher).toBe('Penguin Classics');
    });

    it('allows multiple users to add the same book while sharing the catalog entry', async () => {
      const sharedCatalogBook = {
        id: 'shared-catalog-uuid-99',
        isbn: '9780345339706',
        title: 'The Fellowship of the Ring',
        authors: ['J.R.R. Tolkien'],
        createdAt: '2026-07-31T00:00:00.000Z',
      };

      // User 1 adds book
      mockSend.mockResolvedValueOnce({ Items: [sharedCatalogBook] }); // Query ISBN -> found!
      mockSend.mockResolvedValueOnce({}); // Put user 1 user_library entry

      const user1Book = await addBookForUser('user-1', { isbn: '9780345339706' });

      // User 2 adds same book
      mockSend.mockResolvedValueOnce({ Items: [sharedCatalogBook] }); // Query ISBN -> found!
      mockSend.mockResolvedValueOnce({}); // Put user 2 user_library entry

      const user2Book = await addBookForUser('user-2', { isbn: '9780345339706', readStatus: 'reading' });

      expect(user1Book.ownerId).toBe('user-1');
      expect(user2Book.ownerId).toBe('user-2');
      expect(user1Book.bookId).toBe(sharedCatalogBook.id);
      expect(user2Book.bookId).toBe(sharedCatalogBook.id);
    });
  });

  describe('User Operations', () => {
    it('saves and retrieves user profile from users table', async () => {
      mockSend.mockResolvedValueOnce({}); // putUser
      const user = await putUser({
        id: 'usr-100',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2026-07-31T00:00:00.000Z',
      });
      expect(user.id).toBe('usr-100');

      mockSend.mockResolvedValueOnce({ Item: user }); // getUserById
      const fetched = await getUserById('usr-100');
      expect(fetched).toEqual(user);
    });
  });

  describe('OpenLibrary WorkKey Auto-Resolution & Backfill', () => {
    it('automatically resolves and saves workKey if catalog book has workKey as null', async () => {
      const catalogItemWithNullWorkKey = {
        id: 'book-123',
        isbn: '9780140449136',
        title: 'The Odyssey',
        authors: ['Homer'],
        workKey: null,
        createdAt: '2026-08-01T00:00:00.000Z',
      };

      // 1. GetCommand -> returns item with workKey: null
      mockSend.mockResolvedValueOnce({ Item: catalogItemWithNullWorkKey });
      // 2. PutCommand -> saves item with resolved workKey
      mockSend.mockResolvedValueOnce({});

      const catalogBook = await getCatalogBookById('book-123');

      expect(resolveWorkIdFromIsbn).toHaveBeenCalledWith('9780140449136');
      expect(catalogBook).not.toBeNull();
      expect(catalogBook?.workKey).toBe('OL99999W');
    });

    it('scans books table and backfills missing workKeys', async () => {
      const itemsToScan = [
        { id: 'b1', isbn: '9780140449136', title: 'Book 1', workKey: null },
        { id: 'b2', isbn: '9780545010221', title: 'Book 2', workKey: 'OL82563W' },
      ];

      // 1. ScanCommand -> returns items
      mockSend.mockResolvedValueOnce({ Items: itemsToScan });
      // 2. PutCommand for b1 update
      mockSend.mockResolvedValueOnce({});

      const stats = await backfillBooksTableWorkKeys();

      expect(stats.scanned).toBe(2);
      expect(stats.updated).toBe(1);
      expect(resolveWorkIdFromIsbn).toHaveBeenCalledWith('9780140449136');
    });
  });

  describe('getBookById validation', () => {
    it('throws an error if the catalog book has no ISBN', async () => {
      const mockEntry = {
        id: 'user-book-1',
        userId: 'user-123',
        bookId: 'catalog-book-123',
        readStatus: 'read',
        dateAdded: '2026-08-01T00:00:00.000Z',
      };
      const mockCatalogBook = {
        id: 'catalog-book-123',
        isbn: '', // missing ISBN
        title: 'Book without ISBN',
        authors: ['Unknown'],
        createdAt: '2026-08-01T00:00:00.000Z',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockSend.mockResolvedValueOnce({ Item: mockEntry }); // GetCommand on user_library table
      mockSend.mockResolvedValueOnce({ Item: mockCatalogBook }); // GetCommand on books table

      await expect(getBookById('user-123', 'user-book-1')).rejects.toThrow('Book ISBN is missing');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in mapToBook: Book ISBN is missing');
      consoleErrorSpy.mockRestore();
    });

    it('throws an error if the catalog book has no workKey', async () => {
      const mockEntry = {
        id: 'user-book-2',
        userId: 'user-123',
        bookId: 'catalog-book-456',
        readStatus: 'read',
        dateAdded: '2026-08-01T00:00:00.000Z',
      };
      const mockCatalogBook = {
        id: 'catalog-book-456',
        isbn: '9780123456789',
        title: 'Book without WorkKey',
        authors: ['Unknown'],
        createdAt: '2026-08-01T00:00:00.000Z',
        workKey: null as any, // missing workKey
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (resolveWorkIdFromIsbn as jest.Mock).mockResolvedValueOnce(null);

      mockSend.mockResolvedValueOnce({ Item: mockEntry }); // GetCommand on user_library table
      mockSend.mockResolvedValueOnce({ Item: mockCatalogBook }); // GetCommand on books table

      await expect(getBookById('user-123', 'user-book-2')).rejects.toThrow('Book workId is missing');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in mapToBook: Book workId is missing. ISBN: 9780123456789');

      consoleErrorSpy.mockRestore();
    });
  });
});
