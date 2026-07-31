import { Book, SeriesDetails } from '../../types';
import {
  addBook,
  addSeries,
  deleteBook,
  getAllSeries,
  getBookById,
  getBooks,
  getSeries,
  getUserAllSeriesStatus,
  getUserSeriesStatus,
  isOfflineMode,
  resetMockDatabase,
  setDevOrOfflineMode,
  updateBook,
  updateSeries,
  updateUserSeriesStatus,
} from '../firestoreService';

describe('Database and Firestore Service (Local Mock & Offline Fallback)', () => {
  beforeEach(() => {
    resetMockDatabase();
    setDevOrOfflineMode(true);
  });

  describe('Offline Mode Config', () => {
    it('defaults to offline/dev mock mode when no active Firestore instance', () => {
      expect(isOfflineMode()).toBe(true);
    });
  });

  describe('Book CRUD Operations', () => {
    it('adds and retrieves books for a user', async () => {
      const bookData: Omit<Book, 'id' | 'dateAdded'> = {
        ownerId: 'user_123',
        isbn: '9780545010221',
        title: 'Harry Potter 7',
        authors: ['J.K. Rowling'],
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780545010221-L.jpg',
        publisher: 'Scholastic',
        publishDate: '2007',
        pageCount: 759,
        readStatus: 'read',
      };

      const added = await addBook(bookData);
      expect(added.id).toBeDefined();
      expect(added.dateAdded).toBeDefined();
      expect(added.title).toBe('Harry Potter 7');

      const userBooks = await getBooks('user_123');
      expect(userBooks).toHaveLength(1);
      expect(userBooks[0].id).toBe(added.id);

      const fetchedById = await getBookById(added.id);
      expect(fetchedById).toEqual(added);
    });

    it('updates existing book metadata', async () => {
      const added = await addBook({
        ownerId: 'user_123',
        isbn: '9780545010221',
        title: 'Draft Title',
        authors: ['Author'],
        coverUrl: null,
        publisher: 'Pub',
        publishDate: '2020',
        pageCount: 100,
        readStatus: 'unread',
      });

      const updated = await updateBook(added.id, {
        readStatus: 'read',
        rating: 5,
        review: 'Masterpiece!',
      });

      expect(updated).not.toBeNull();
      expect(updated?.readStatus).toBe('read');
      expect(updated?.rating).toBe(5);
      expect(updated?.review).toBe('Masterpiece!');

      const fetched = await getBookById(added.id);
      expect(fetched?.readStatus).toBe('read');
    });

    it('deletes a book', async () => {
      const added = await addBook({
        ownerId: 'user_123',
        isbn: '9780545010221',
        title: 'ToDelete',
        authors: ['Author'],
        coverUrl: null,
        publisher: 'Pub',
        publishDate: '2020',
        pageCount: 100,
        readStatus: 'unread',
      });

      const deleteResult = await deleteBook(added.id);
      expect(deleteResult).toBe(true);

      const fetched = await getBookById(added.id);
      expect(fetched).toBeNull();
    });
  });

  describe('Series CRUD Operations', () => {
    it('creates, reads, and updates series details', async () => {
      const seriesData: Omit<SeriesDetails, 'id'> = {
        name: 'The Lord of the Rings',
        openLibraryWorkId: 'OL27479W',
        volumes: [
          { volumeNumber: 1, title: 'The Fellowship of the Ring' },
          { volumeNumber: 2, title: 'The Two Towers' },
          { volumeNumber: 3, title: 'The Return of the King' },
        ],
        totalVolumes: 3,
      };

      const added = await addSeries(seriesData);
      expect(added.id).toBe('series_OL27479W');

      const fetched = await getSeries(added.id);
      expect(fetched).toEqual(added);

      const all = await getAllSeries();
      expect(all).toHaveLength(1);

      const updated = await updateSeries(added.id, { name: 'LOTR Trilogy' });
      expect(updated?.name).toBe('LOTR Trilogy');
    });
  });

  describe('User Series Status CRUD Operations', () => {
    it('updates and retrieves user series status', async () => {
      const status = await updateUserSeriesStatus('user_123', 'series_LOTR', {
        isCompleted: false,
        ignoredVolumes: ['3'],
      });

      expect(status.userId).toBe('user_123');
      expect(status.seriesId).toBe('series_LOTR');
      expect(status.ignoredVolumes).toEqual(['3']);

      const fetched = await getUserSeriesStatus('user_123', 'series_LOTR');
      expect(fetched).toEqual(status);

      const userAll = await getUserAllSeriesStatus('user_123');
      expect(userAll).toHaveLength(1);
    });
  });
});
