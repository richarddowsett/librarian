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

export interface UserLibraryEntry {
  id: string; // userBookId
  userId: string;
  bookId: string;
  readStatus: ReadStatus;
  rating?: number | null;
  review?: string | null;
  seriesId?: string | null;
  seriesName?: string | null;
  seriesVolumeNumber?: number | null;
  dateAdded: string;
  dateRead?: string | null;
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

export interface SeriesVolume {
  volumeNumber: number;
  title: string;
  isbn?: string | null;
  workId?: string | null;
  coverUrl?: string | null;
}

export interface SeriesDetails {
  id: string;
  name: string;
  openLibraryWorkId?: string | null;
  volumes: SeriesVolume[];
  totalVolumes: number;
}

export interface UserSeriesStatus {
  id: string;
  userId: string;
  seriesId: string;
  isCompleted: boolean;
  ignoredVolumes: string[];
}

export interface SeriesProgress {
  seriesId: string;
  seriesName: string;
  totalVolumes: number;
  ownedCount: number;
  missingCount: number;
  ownedPercentage: number;
  ownedVolumes: SeriesVolume[];
  missingVolumes: SeriesVolume[];
  isCompleted: boolean;
  wishlistStatus: 'completed' | 'in_progress' | 'not_started';
}

export interface ExtractedBook {
  title: string;
  author?: string;
  confidence: number;
  spine_location_hint?: string;
}

export interface GeminiAnalysisResult {
  is_bookshelf: boolean;
  guardrail_reason: string | null;
  extracted_books: ExtractedBook[];
}

export type BedrockAnalysisResult = GeminiAnalysisResult;

export interface BookshelfAnalyzeResponse {
  success: boolean;
  isBookshelf: boolean;
  message?: string;
  candidateBooks: SanitizedBookMetadata[];
  books?: SanitizedBookMetadata[];
}


