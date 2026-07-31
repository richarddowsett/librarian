import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Book, CreateBookInput, UpdateBookReviewInput, bookSchema } from '../schemas/book';
import { useAuth } from './AuthContext';
import { fetchBooksApi, addBookApi, updateBookApi, deleteBookApi } from '../services/apiClient';

export interface SeriesVolumeItem {
  volumeNumber: number;
  isOwned: boolean;
  title: string;
  book?: Book;
}

export interface SeriesOverview {
  seriesId: string;
  seriesName: string;
  totalOwned: number;
  maxVolumeOwned: number;
  books: Book[];
  missingVolumes: number[];
  allVolumes: SeriesVolumeItem[];
}

export interface AuthorBookItem {
  id: string;
  title: string;
  isOwned: boolean;
  seriesName?: string;
  seriesVolumeNumber?: number;
  book?: Book;
}

export interface AuthorOverview {
  authorName: string;
  totalOwned: number;
  totalKnown: number;
  books: Book[];
  allBooks: AuthorBookItem[];
}

interface LibraryContextType {
  books: Book[];
  filteredBooks: Book[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: 'all' | 'unread' | 'reading' | 'read';
  setStatusFilter: (status: 'all' | 'unread' | 'reading' | 'read') => void;
  addBook: (input: Omit<CreateBookInput, 'ownerId'>) => Promise<{ success: boolean; book?: Book; error?: string }>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  updateBookReview: (id: string, reviewData: UpdateBookReviewInput) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  getBookById: (id: string) => Book | undefined;
  seriesOverviews: SeriesOverview[];
  authorOverviews: AuthorOverview[];
  stats: {
    totalBooks: number;
    readCount: number;
    readingCount: number;
    unreadCount: number;
    avgRating: number;
  };
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authToken } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'reading' | 'read'>('all');

  // Load books from API Gateway using Cognito JWT Token
  useEffect(() => {
    async function loadBackendBooks() {
      if (!user) {
        setBooks([]);
        return;
      }

      const remoteBooks = await fetchBooksApi({
        authToken: authToken || undefined,
        userId: user.uid,
      });

      setBooks(remoteBooks || []);
    }
    loadBackendBooks();
  }, [user, authToken]);

  const userBooks = useMemo(() => {
    if (!user) return [];
    return books;
  }, [books, user]);

  const filteredBooks = useMemo(() => {
    return userBooks.filter((book) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
        book.isbn.includes(searchQuery.trim());

      const matchesStatus = statusFilter === 'all' || book.readStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [userBooks, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const totalBooks = userBooks.length;
    const readCount = userBooks.filter((b) => b.readStatus === 'read').length;
    const readingCount = userBooks.filter((b) => b.readStatus === 'reading').length;
    const unreadCount = userBooks.filter((b) => b.readStatus === 'unread').length;

    const ratedBooks = userBooks.filter((b) => typeof b.rating === 'number' && b.rating > 0);
    const avgRating = ratedBooks.length
      ? Math.round((ratedBooks.reduce((acc, b) => acc + (b.rating || 0), 0) / ratedBooks.length) * 10) / 10
      : 0;

    return { totalBooks, readCount, readingCount, unreadCount, avgRating };
  }, [userBooks]);

  const seriesOverviews = useMemo(() => {
    const seriesMap = new Map<string, { name: string; books: Book[] }>();

    userBooks.forEach((book) => {
      if (book.seriesId && book.seriesName) {
        if (!seriesMap.has(book.seriesId)) {
          seriesMap.set(book.seriesId, { name: book.seriesName, books: [] });
        }
        seriesMap.get(book.seriesId)!.books.push(book);
      }
    });

    const result: SeriesOverview[] = [];
    seriesMap.forEach((val, seriesId) => {
      const sortedBooks = [...val.books].sort(
        (a, b) => (a.seriesVolumeNumber || 0) - (b.seriesVolumeNumber || 0)
      );
      const volumes = sortedBooks
        .map((b) => b.seriesVolumeNumber)
        .filter((v): v is number => typeof v === 'number');

      const maxVol = volumes.length ? Math.max(...volumes) : 0;
      const missingVolumes: number[] = [];
      const allVolumes: SeriesVolumeItem[] = [];

      for (let i = 1; i <= maxVol; i++) {
        const ownedBook = sortedBooks.find((b) => b.seriesVolumeNumber === i);
        if (ownedBook) {
          allVolumes.push({
            volumeNumber: i,
            isOwned: true,
            title: ownedBook.title,
            book: ownedBook,
          });
        } else {
          missingVolumes.push(i);
          allVolumes.push({
            volumeNumber: i,
            isOwned: false,
            title: `Vol #${i}`,
          });
        }
      }

      result.push({
        seriesId,
        seriesName: val.name,
        totalOwned: sortedBooks.length,
        maxVolumeOwned: maxVol,
        books: sortedBooks,
        missingVolumes,
        allVolumes,
      });
    });

    return result;
  }, [userBooks]);

  const authorOverviews = useMemo(() => {
    const authorMap = new Map<string, Book[]>();

    userBooks.forEach((book) => {
      if (Array.isArray(book.authors)) {
        book.authors.forEach((author) => {
          const cleanAuthor = author.trim();
          if (cleanAuthor) {
            if (!authorMap.has(cleanAuthor)) {
              authorMap.set(cleanAuthor, []);
            }
            const existingList = authorMap.get(cleanAuthor)!;
            if (!existingList.some((b) => b.id === book.id)) {
              existingList.push(book);
            }
          }
        });
      }
    });

    const result: AuthorOverview[] = [];
    authorMap.forEach((booksForAuthor, authorName) => {
      const sortedOwned = [...booksForAuthor].sort((a, b) => a.title.localeCompare(b.title));
      const allBooks: AuthorBookItem[] = [];

      // Add all owned books
      sortedOwned.forEach((book) => {
        allBooks.push({
          id: book.id || `owned-${book.title}`,
          title: book.title,
          isOwned: true,
          seriesName: book.seriesName || undefined,
          seriesVolumeNumber: book.seriesVolumeNumber || undefined,
          book,
        });
      });

      // Find series associated with this author's books and add missing series volumes
      const authorSeriesIds = new Set(booksForAuthor.map((b) => b.seriesId).filter(Boolean));
      authorSeriesIds.forEach((seriesId) => {
        const seriesData = seriesOverviews.find((s) => s.seriesId === seriesId);
        if (seriesData && seriesData.missingVolumes.length > 0) {
          seriesData.missingVolumes.forEach((missingVol) => {
            allBooks.push({
              id: `missing-${seriesId}-vol-${missingVol}`,
              title: `Vol #${missingVol}`,
              isOwned: false,
              seriesName: seriesData.seriesName,
              seriesVolumeNumber: missingVol,
            });
          });
        }
      });

      result.push({
        authorName,
        totalOwned: sortedOwned.length,
        totalKnown: allBooks.length,
        books: sortedOwned,
        allBooks,
      });
    });

    return result.sort((a, b) => b.totalOwned - a.totalOwned);
  }, [userBooks, seriesOverviews]);

  const addBook = async (input: Omit<CreateBookInput, 'ownerId'>) => {
    const ownerId = user?.uid || 'dev-user-12345';

    // Check for duplicate books by ISBN or exact Title
    const cleanIsbn = (str?: string) => (str || '').replace(/[- ]/g, '').trim();
    const inputIsbn = cleanIsbn(input.isbn);
    const inputTitle = (input.title || '').trim().toLowerCase();

    const existingBook = books.find((b) => {
      const existingIsbn = cleanIsbn(b.isbn);
      const existingTitle = (b.title || '').trim().toLowerCase();

      if (inputIsbn && existingIsbn && inputIsbn === existingIsbn) {
        return true;
      }
      if (inputTitle && existingTitle && inputTitle === existingTitle) {
        return true;
      }
      return false;
    });

    if (existingBook) {
      return {
        success: false,
        error: `Book "${existingBook.title}" already exists in your library!`,
      };
    }

    const newBookCandidate = {
      ...input,
      ownerId,
      dateAdded: new Date().toISOString(),
    };

    const parseResult = bookSchema.safeParse(newBookCandidate);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return { success: false, error: errorMsg };
    }

    const tempBook: Book = {
      ...parseResult.data,
      id: 'book-' + Date.now(),
    };

    // Optimistic local state update
    setBooks((prev) => [tempBook, ...prev]);

    // Send to backend API Gateway with Cognito JWT
    const remoteBook = await addBookApi(input, {
      authToken: authToken || undefined,
      userId: ownerId,
    });

    if (remoteBook) {
      setBooks((prev) => prev.map((b) => (b.id === tempBook.id ? remoteBook : b)));
      return { success: true, book: remoteBook };
    }

    return { success: true, book: tempBook };
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const ownerId = user?.uid || 'dev-user-12345';
    // Optimistic local state update
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );

    // Call API Gateway PUT endpoint
    const updatedRemote = await updateBookApi(id, updates, {
      authToken: authToken || undefined,
      userId: ownerId,
    });

    if (updatedRemote) {
      setBooks((prev) => prev.map((b) => (b.id === id ? updatedRemote : b)));
    }
  };

  const updateBookReview = async (id: string, reviewData: UpdateBookReviewInput) => {
    const targetBook = books.find((b) => b.id === id);
    const isNowRead = reviewData.readStatus === 'read';

    const updates: Partial<Book> = {
      readStatus: reviewData.readStatus,
      rating: reviewData.rating !== undefined ? reviewData.rating : targetBook?.rating,
      review: reviewData.review !== undefined ? reviewData.review : targetBook?.review,
      dateRead: isNowRead ? (reviewData.dateRead || targetBook?.dateRead || new Date().toISOString()) : targetBook?.dateRead,
    };

    await updateBook(id, updates);
  };

  const deleteBook = async (id: string) => {
    const ownerId = user?.uid || 'dev-user-12345';
    setBooks((prev) => prev.filter((b) => b.id !== id));
    await deleteBookApi(id, {
      authToken: authToken || undefined,
      userId: ownerId,
    });
  };

  const getBookById = (id: string) => {
    return books.find((b) => b.id === id);
  };

  return (
    <LibraryContext.Provider
      value={{
        books: userBooks,
        filteredBooks,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        addBook,
        updateBook,
        updateBookReview,
        deleteBook,
        getBookById,
        seriesOverviews,
        authorOverviews,
        stats,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
