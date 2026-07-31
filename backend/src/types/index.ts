export type ReadStatus = 'unread' | 'reading' | 'read';

export interface Book {
  id: string;
  ownerId: string;
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

export type CreateBookInput = Partial<Book> & {
  title: string;
  isbn: string;
};

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
