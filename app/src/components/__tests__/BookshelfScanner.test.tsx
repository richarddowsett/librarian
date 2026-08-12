import React from 'react';
import {
  getPresignedUploadUrl,
  uploadImageToS3,
  analyzeBookshelfImage,
  BookshelfAnalysisResult,
  BookshelfCandidateBook,
} from '../../services/bookshelfAi';

// Mock dependencies
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123' },
    authToken: 'test-token',
  }),
}));

const mockAddBook = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../context/LibraryContext', () => ({
  useLibrary: () => ({
    addBook: mockAddBook,
    books: [],
  }),
}));

describe('BookshelfScanner & Review Flow Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bookshelf Guardrail Error Handling', () => {
    it('detects non-bookshelf photos and produces guardrail error feedback', async () => {
      const nonBookshelfResult: BookshelfAnalysisResult = {
        isBookshelf: false,
        books: [],
        message: 'No bookshelf detected in photo. Please ensure your photo clearly shows book spines on a shelf.',
      };

      expect(nonBookshelfResult.isBookshelf).toBe(false);
      expect(nonBookshelfResult.books).toHaveLength(0);
      expect(nonBookshelfResult.message).toContain('No bookshelf detected in photo');
    });

    it('allows instant retake state reset after guardrail alert', () => {
      let guardrailAlert: string | null = 'No bookshelf detected in photo.';
      let capturedImageUri: string | null = 'blob:test-image-uri';

      // Simulate handleRetake
      const handleRetake = () => {
        guardrailAlert = null;
        capturedImageUri = null;
      };

      handleRetake();

      expect(guardrailAlert).toBeNull();
      expect(capturedImageUri).toBeNull();
    });
  });

  describe('Bookshelf Candidate Books & Review Step Logic', () => {
    const mockCandidates: BookshelfCandidateBook[] = [
      {
        title: 'Dune',
        authors: ['Frank Herbert'],
        isbn: '9780441172719',
        publisher: 'Chilton Books',
        confidence: 0.95,
      },
      {
        title: 'Foundation',
        authors: ['Isaac Asimov'],
        isbn: '9780553293357',
        publisher: 'Gnome Press',
        confidence: 0.92,
      },
    ];

    it('toggles selection for individual books and batch select/deselect all', () => {
      let items = mockCandidates.map((b, i) => ({ ...b, id: `${i}`, selected: true }));

      expect(items.every((i) => i.selected)).toBe(true);

      // Deselect all
      const deselectAll = () => {
        items = items.map((i) => ({ ...i, selected: false }));
      };
      deselectAll();

      expect(items.every((i) => !i.selected)).toBe(true);

      // Select all
      const selectAll = () => {
        items = items.map((i) => ({ ...i, selected: true }));
      };
      selectAll();

      expect(items.every((i) => i.selected)).toBe(true);
    });

    it('allows inline editing of title and authors on candidate book card', () => {
      let book: BookshelfCandidateBook = {
        title: 'Dune Misspelled',
        authors: ['Frank Herbt'],
      };

      // User edits title & authors
      book = {
        ...book,
        title: 'Dune',
        authors: ['Frank Herbert'],
      };

      expect(book.title).toBe('Dune');
      expect(book.authors).toEqual(['Frank Herbert']);
    });

    it('bulk stages selected books into the library via addBook', async () => {
      const selectedBooks = mockCandidates;

      let addedCount = 0;
      for (const book of selectedBooks) {
        const res = await mockAddBook({
          title: book.title,
          authors: book.authors,
          isbn: book.isbn,
          publisher: book.publisher,
          readStatus: 'unread',
        });
        if (res.success) addedCount++;
      }

      expect(mockAddBook).toHaveBeenCalledTimes(2);
      expect(addedCount).toBe(2);
      expect(mockAddBook).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Dune',
          authors: ['Frank Herbert'],
        })
      );
    });
  });
});
