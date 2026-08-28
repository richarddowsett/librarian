export type ReadStatus = 'unread' | 'reading' | 'read';

export interface User {
  id: string;
  email?: string;
  name?: string;
  createdAt: string;
}

export interface CatalogBook {
  id: string;
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  coverUrl: string | null;
  publisher?: string | null;
  publishDate?: string | null;
  pageCount?: number | null;
  description?: string | null;
  categories?: string[] | null;
  language?: string | null;
  workKey?: string | null;
  createdAt: string;
}

export interface Book {
  id: string; // userBookId
  ownerId: string; // userId
  bookId?: string; // catalog book ID
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  coverUrl: string | null;
  publisher?: string | null;
  publishDate?: string | null;
  pageCount?: number | null;
  description?: string | null;
  categories?: string[] | null;
  language?: string | null;
  readStatus: ReadStatus;
  rating?: number | null;
  review?: string | null;
  seriesId?: string | null;
  seriesName?: string | null;
  seriesVolumeNumber?: number | null;
  workId?: string | null;
  dateAdded: string;
  dateRead?: string | null;
}

export interface SanitizedBookMetadata {
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  coverUrl: string | null;
  publisher: string;
  publishDate: string;
  pageCount: number;
  description?: string | null;
  categories?: string[] | null;
  language?: string | null;
  workKey: string | null;
}
