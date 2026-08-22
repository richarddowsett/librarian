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

// In-memory data store for Firestore mock
const firestoreStore: Record<string, Record<string, any>> = {
  users: {},
  books: {},
  userLibrary: {},
  series: {},
  userSeriesStatus: {},
};

jest.mock('firebase-admin', () => {
  const mockDoc = (collectionName: string, id: string) => ({
    get: jest.fn().mockImplementation(async () => ({
      exists: Boolean(firestoreStore[collectionName]?.[id]),
      data: () => firestoreStore[collectionName]?.[id],
    })),
    set: jest.fn().mockImplementation(async (data: any) => {
      if (!firestoreStore[collectionName]) firestoreStore[collectionName] = {};
      firestoreStore[collectionName][id] = { ...(firestoreStore[collectionName][id] || {}), ...data };
    }),
    delete: jest.fn().mockImplementation(async () => {
      if (firestoreStore[collectionName]) {
        delete firestoreStore[collectionName][id];
      }
    }),
  });

  const mockCollection = (collectionName: string) => ({
    doc: (id: string) => mockDoc(collectionName, id),
    where: (field: string, op: string, value: any) => ({
      limit: (n: number) => ({
        get: jest.fn().mockImplementation(async () => {
          const docs = Object.values(firestoreStore[collectionName] || {})
            .filter((item) => item[field] === value)
            .slice(0, n)
            .map((data) => ({ data: () => data }));
          return { empty: docs.length === 0, docs };
        }),
      }),
      get: jest.fn().mockImplementation(async () => {
        const docs = Object.values(firestoreStore[collectionName] || {})
          .filter((item) => item[field] === value)
          .map((data) => ({ data: () => data }));
        return { empty: docs.length === 0, docs };
      }),
    }),
    get: jest.fn().mockImplementation(async () => {
      const docs = Object.values(firestoreStore[collectionName] || {}).map((data) => ({
        data: () => data,
      }));
      return { size: docs.length, docs };
    }),
  });

  return {
    apps: ['mock-app'],
    initializeApp: jest.fn(),
    firestore: () => ({
      collection: (name: string) => mockCollection(name),
    }),
  };
});

// Mock googleBooks fetcher
jest.mock('../googleBooks', () => ({
  fetchBookByISBN: jest.fn(),
  searchBooksByTitleAndAuthor: jest.fn(),
}));

// Mock openLibrary resolver
jest.mock('../openLibrary', () => ({
  resolveWorkIdFromIsbn: jest.fn().mockResolvedValue('OL12345W'),
}));

describe('Firestore Database Service', () => {
  beforeEach(() => {
    firestoreStore.users = {};
    firestoreStore.books = {};
    firestoreStore.userLibrary = {};
    firestoreStore.series = {};
    firestoreStore.userSeriesStatus = {};
  });

  describe('Users Operations', () => {
    it('should put and get user by id', async () => {
      const user = { id: 'u1', name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01' };
      await putUser(user);

      const fetched = await getUserById('u1');
      expect(fetched).toEqual(user);
    });

    it('should return null for non-existent user', async () => {
      const fetched = await getUserById('non-existent');
      expect(fetched).toBeNull();
    });
  });

  describe('Books Catalog Operations', () => {
    it('should find catalog book by ISBN', async () => {
      const catalogBook = {
        id: 'cb1',
        isbn: '9780141036144',
        title: '1984',
        authors: ['George Orwell'],
        coverUrl: 'https://covers.com/1984.jpg',
        workKey: 'OL100W',
        createdAt: '2026-01-01',
      };
      firestoreStore.books['cb1'] = catalogBook;

      const found = await findCatalogBookByIsbn('978-0141036144');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('1984');
    });

    it('should return null for unknown ISBN', async () => {
      const found = await findCatalogBookByIsbn('9999999999999');
      expect(found).toBeNull();
    });
  });

  describe('User Library Operations', () => {
    it('should add a book for a user and link to catalog', async () => {
      const book = await addBookForUser('u1', {
        isbn: '9780141036144',
        title: '1984',
        authors: ['George Orwell'],
        readStatus: 'reading',
        workId: 'OL100W',
      });

      expect(book.ownerId).toBe('u1');
      expect(book.title).toBe('1984');
      expect(book.readStatus).toBe('reading');

      const userBooks = await getBooksByOwner('u1');
      expect(userBooks.length).toBe(1);
      expect(userBooks[0].title).toBe('1984');
    });

    it('should update readStatus of an existing user book', async () => {
      const added = await addBookForUser('u1', {
        isbn: '9780141036144',
        title: '1984',
        authors: ['George Orwell'],
        readStatus: 'unread',
        workId: 'OL100W',
      });

      const updated = await updateBook('u1', added.id, { readStatus: 'read' });
      expect(updated?.readStatus).toBe('read');
    });

    it('should delete a user book entry', async () => {
      const added = await addBookForUser('u1', {
        isbn: '9780141036144',
        title: '1984',
        authors: ['George Orwell'],
        workId: 'OL100W',
      });

      await deleteBook('u1', added.id);
      const userBooks = await getBooksByOwner('u1');
      expect(userBooks.length).toBe(0);
    });
  });
});
