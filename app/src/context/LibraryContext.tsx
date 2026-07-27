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

const INITIAL_DEMO_BOOKS: Book[] = [
  {
    id: 'book-1',
    ownerId: 'dev-user-12345',
    isbn: '9780545010221',
    title: 'Harry Potter and the Deathly Hallows',
    authors: ['J.K. Rowling'],
    coverUrl: 'https://images.openlibrary.org/b/id/14412329-L.jpg',
    publisher: 'Arthur A. Levine Books',
    publishDate: '2007',
    pageCount: 759,
    readStatus: 'read',
    rating: 5,
    review: 'An incredible epic conclusion to the Harry Potter saga! The Battle of Hogwarts is unforgettable.',
    seriesId: 'series-hp',
    seriesName: 'Harry Potter',
    seriesVolumeNumber: 7,
    dateAdded: '2026-01-10T10:00:00.000Z',
    dateRead: '2026-02-15T18:30:00.000Z',
  },
  {
    id: 'book-2',
    ownerId: 'dev-user-12345',
    isbn: '9780439358071',
    title: 'Harry Potter and the Order of the Phoenix',
    authors: ['J.K. Rowling'],
    coverUrl: 'https://images.openlibrary.org/b/id/10523366-L.jpg',
    publisher: 'Scholastic',
    publishDate: '2003',
    pageCount: 870,
    readStatus: 'read',
    rating: 4,
    review: 'Darker tone, great character development for Dumbledore\'s Army.',
    seriesId: 'series-hp',
    seriesName: 'Harry Potter',
    seriesVolumeNumber: 5,
    dateAdded: '2026-01-05T10:00:00.000Z',
    dateRead: '2026-01-20T18:30:00.000Z',
  },
  {
    id: 'book-3',
    ownerId: 'dev-user-12345',
    isbn: '9780765311788',
    title: 'Mistborn: The Final Empire',
    authors: ['Brandon Sanderson'],
    coverUrl: 'https://images.openlibrary.org/b/id/8311916-L.jpg',
    publisher: 'Tor Books',
    publishDate: '2006',
    pageCount: 541,
    readStatus: 'reading',
    rating: 5,
    review: 'The Allomancy magic system is mind-blowing! Kelsier and Vin are fantastic protagonists.',
    seriesId: 'series-mistborn',
    seriesName: 'Mistborn Era 1',
    seriesVolumeNumber: 1,
    dateAdded: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 'book-4',
    ownerId: 'dev-user-12345',
    isbn: '9780593135204',
    title: 'Project Hail Mary',
    authors: ['Andy Weir'],
    coverUrl: 'https://images.openlibrary.org/b/id/12539704-L.jpg',
    publisher: 'Ballantine Books',
    publishDate: '2021',
    pageCount: 496,
    readStatus: 'read',
    rating: 5,
    review: 'Fist my bump! Rocky and Ryland Grace make one of the best sci-fi duos ever written.',
    dateAdded: '2026-02-14T09:00:00.000Z',
    dateRead: '2026-02-28T22:00:00.000Z',
  },
  {
    id: 'book-5',
    ownerId: 'dev-user-12345',
    isbn: '9780441172719',
    title: 'Dune',
    authors: ['Frank Herbert'],
    coverUrl: 'https://images.openlibrary.org/b/id/9103986-L.jpg',
    publisher: 'Ace Books',
    publishDate: '1965',
    pageCount: 688,
    readStatus: 'unread',
    seriesId: 'series-dune',
    seriesName: 'Dune Chronicles',
    seriesVolumeNumber: 1,
    dateAdded: '2026-04-01T15:00:00.000Z',
  },
  {
    id: 'book-6',
    ownerId: 'dev-user-12345',
    isbn: '9780441013593',
    title: 'Dune Messiah',
    authors: ['Frank Herbert'],
    coverUrl: 'https://images.openlibrary.org/b/id/8316314-L.jpg',
    publisher: 'Ace Books',
    publishDate: '1969',
    pageCount: 336,
    readStatus: 'unread',
    seriesId: 'series-dune',
    seriesName: 'Dune Chronicles',
    seriesVolumeNumber: 2,
    dateAdded: '2026-04-02T11:00:00.000Z',
  }
];

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>(INITIAL_DEMO_BOOKS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'reading' | 'read'>('all');

  // Load books from backend API when component mounts or user changes
  useEffect(() => {
    async function loadBackendBooks() {
      const remoteBooks = await fetchBooksApi({ userId: user?.uid || 'dev-user-12345' });
      if (remoteBooks && remoteBooks.length > 0) {
        setBooks(remoteBooks);
      }
    }
    loadBackendBooks();
  }, [user]);

  const userBooks = useMemo(() => {
    if (!user) return [];
    return books.filter((b) => b.ownerId === user.uid || b.ownerId === 'dev-user-12345');
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

    const createdBook: Book = {
      ...parseResult.data,
      id: 'book-' + Date.now(),
    };

    // Optimistic update
    setBooks((prev) => [createdBook, ...prev]);

    // Send to backend API Gateway
    const remoteBook = await addBookApi(input, { userId: ownerId });
    if (remoteBook) {
      setBooks((prev) => prev.map((b) => (b.id === createdBook.id ? remoteBook : b)));
    }

    return { success: true, book: createdBook };
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const ownerId = user?.uid || 'dev-user-12345';
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    await updateBookApi(id, updates, { userId: ownerId });
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
    await deleteBookApi(id, { userId: ownerId });
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
