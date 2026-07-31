import {
  addBookForUser,
  getBooksByOwner,
  getBookById,
  updateBook,
  deleteBook,
  getUserById,
  putUser,
  findCatalogBookByIsbn,
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

import { fetchBookByISBN } from '../googleBooks';

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
});
