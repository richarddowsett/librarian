import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Book, CreateBookInput, UpdateBookReviewInput, bookSchema } from '../schemas/book';
import { useAuth } from './AuthContext';
import { fetchBooksApi, addBookApi, updateBookApi, deleteBookApi } from '../services/apiClient';

export interface SeriesOverview {
  seriesId: string;
  seriesName: string;
  totalOwned: number;
  maxVolumeOwned: number;
  books: Book[];
  missingVolumes: number[];
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

      for (let i = 1; i <= maxVol; i++) {
        if (!volumes.includes(i)) {
          missingVolumes.push(i);
        }
      }

      result.push({
        seriesId,
        seriesName: val.name,
        totalOwned: sortedBooks.length,
        maxVolumeOwned: maxVol,
        books: sortedBooks,
        missingVolumes,
      });
    });

    return result;
  }, [userBooks]);

  const addBook = async (input: Omit<CreateBookInput, 'ownerId'>) => {
    const ownerId = user?.uid || 'dev-user-12345';
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
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    await updateBookApi(id, updates, {
      authToken: authToken || undefined,
      userId: ownerId,
    });
  };

  const updateBookReview = async (id: string, reviewData: UpdateBookReviewInput) => {
    const isNowRead = reviewData.readStatus === 'read';
    const updates: Partial<Book> = {
      readStatus: reviewData.readStatus,
      rating: reviewData.rating,
      review: reviewData.review,
      dateRead: isNowRead ? (reviewData.dateRead || new Date().toISOString()) : undefined,
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
