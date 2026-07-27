import { bookSchema, updateBookReviewSchema, bookSearchFilterSchema } from './book';

describe('Book Zod Schemas', () => {
  describe('bookSchema', () => {
    it('validates a valid book candidate', () => {
      const validBook = {
        ownerId: 'user-123',
        title: 'Mistborn: The Final Empire',
        authors: ['Brandon Sanderson'],
        isbn: '978-0765311788',
        readStatus: 'read' as const,
        rating: 5,
        review: 'Fantastic magic system!',
      };

      const result = bookSchema.safeParse(validBook);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbn).toBe('9780765311788');
        expect(result.data.title).toBe('Mistborn: The Final Empire');
      }
    });

    it('fails validation when ownerId is missing or empty', () => {
      const invalidBook = {
        ownerId: '',
        title: 'Valid Title',
        authors: ['Author Name'],
        isbn: '9780545010221',
      };

      const result = bookSchema.safeParse(invalidBook);
      expect(result.success).toBe(false);
    });

    it('fails validation when title is empty', () => {
      const invalidBook = {
        ownerId: 'user-123',
        title: '',
        authors: ['Author Name'],
        isbn: '9780545010221',
      };

      const result = bookSchema.safeParse(invalidBook);
      expect(result.success).toBe(false);
    });

    it('fails validation when authors array is empty', () => {
      const invalidBook = {
        ownerId: 'user-123',
        title: 'Title',
        authors: [],
        isbn: '9780545010221',
      };

      const result = bookSchema.safeParse(invalidBook);
      expect(result.success).toBe(false);
    });

    it('validates 10-digit and 13-digit ISBN formats', () => {
      const book10 = {
        ownerId: 'user-123',
        title: 'Title',
        authors: ['Author'],
        isbn: '0545010225',
      };
      expect(bookSchema.safeParse(book10).success).toBe(true);

      const book13 = {
        ownerId: 'user-123',
        title: 'Title',
        authors: ['Author'],
        isbn: '978-0-545-01022-1',
      };
      expect(bookSchema.safeParse(book13).success).toBe(true);
    });

    it('fails invalid ISBN format', () => {
      const invalidIsbn = {
        ownerId: 'user-123',
        title: 'Title',
        authors: ['Author'],
        isbn: '123-invalid-isbn',
      };
      expect(bookSchema.safeParse(invalidIsbn).success).toBe(false);
    });
  });

  describe('updateBookReviewSchema', () => {
    it('validates review updates', () => {
      const reviewPayload = {
        readStatus: 'read' as const,
        rating: 4,
        review: 'Great book!',
        dateRead: '2026-07-27T20:00:00Z',
      };

      const result = updateBookReviewSchema.safeParse(reviewPayload);
      expect(result.success).toBe(true);
    });

    it('rejects out of bound star rating', () => {
      const invalidPayload = {
        readStatus: 'read' as const,
        rating: 6,
      };

      const result = updateBookReviewSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('bookSearchFilterSchema', () => {
    it('applies default search filters', () => {
      const defaultFilters = bookSearchFilterSchema.parse({});
      expect(defaultFilters.query).toBe('');
      expect(defaultFilters.statusFilter).toBe('all');
      expect(defaultFilters.sortBy).toBe('dateAdded');
      expect(defaultFilters.sortOrder).toBe('desc');
    });
  });
});
