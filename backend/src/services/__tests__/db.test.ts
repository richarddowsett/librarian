import {
  getBooksByUser,
  addBookForUser,
  updateUserBook,
  deleteUserBook,
  getUserSeriesStatusDb,
  saveUserSeriesStatusDb,
  setDbPoolForTesting,
} from '../db';

describe('PostgreSQL Database Service', () => {
  let mockQuery: jest.Mock;
  let mockPool: any;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
    setDbPoolForTesting(mockPool);
  });

  afterEach(() => {
    setDbPoolForTesting(null);
  });

  describe('getBooksByUser', () => {
    it('queries user_books joined with books for a specific user ID', async () => {
      const mockRow = {
        id: 'ub-123',
        user_id: 'user-abc',
        isbn: '9780545010221',
        title: 'Harry Potter',
        subtitle: null,
        authors: ['J.K. Rowling'],
        cover_url: 'https://example.com/cover.jpg',
        publisher: 'Scholastic',
        publish_date: '2007',
        page_count: 759,
        description: 'Magic story',
        categories: ['Fantasy'],
        language: 'en',
        work_key: 'OL123W',
        read_status: 'read',
        rating: '5',
        review: 'Great book!',
        series_id: 'hp',
        series_name: 'Harry Potter',
        series_volume_number: '7',
        date_added: new Date('2026-07-31T00:00:00Z'),
        date_read: new Date('2026-07-31T00:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const books = await getBooksByUser('user-abc');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM user_books ub'),
        ['user-abc']
      );
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Harry Potter');
      expect(books[0].ownerId).toBe('user-abc');
      expect(books[0].rating).toBe(5);
    });
  });

  describe('addBookForUser', () => {
    it('deduplicates existing ISBN in internal books table before creating user_books link', async () => {
      // 1. SELECT id FROM books WHERE isbn = $1
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-book-uuid-999' }] });
      // 2. INSERT INTO user_books
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ub-new-123' }] });
      // 3. SELECT full joined row
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ub-new-123',
            user_id: 'user-abc',
            isbn: '9780545010221',
            title: 'Harry Potter',
            authors: ['J.K. Rowling'],
            read_status: 'unread',
          },
        ],
      });

      const result = await addBookForUser('user-abc', {
        isbn: '9780545010221',
        title: 'Harry Potter',
        authors: ['J.K. Rowling'],
      });

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        `SELECT id FROM books WHERE isbn = $1`,
        ['9780545010221']
      );
      expect(result.id).toBe('ub-new-123');
    });
  });

  describe('deleteUserBook', () => {
    it('deletes from user_books matching user_id and user_book_id', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const success = await deleteUserBook('user-abc', 'ub-123');

      expect(mockQuery).toHaveBeenCalledWith(
        `DELETE FROM user_books WHERE id = $1 AND user_id = $2;`,
        ['ub-123', 'user-abc']
      );
      expect(success).toBe(true);
    });
  });

  describe('getUserSeriesStatusDb', () => {
    it('queries user_series_status table', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uss-1',
            user_id: 'user-abc',
            series_id: 'series-hp',
            is_completed: true,
            ignored_volumes: ['8'],
          },
        ],
      });

      const status = await getUserSeriesStatusDb('user-abc', 'series-hp');

      expect(status).toEqual({
        id: 'uss-1',
        userId: 'user-abc',
        seriesId: 'series-hp',
        isCompleted: true,
        ignoredVolumes: ['8'],
      });
    });
  });
});
