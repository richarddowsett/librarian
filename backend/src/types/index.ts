export type ReadStatus = 'unread' | 'reading' | 'read';

export interface Book {
  id: string;
  ownerId: string;
  isbn: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publisher: string;
  publishDate: string;
  pageCount: number;
  readStatus: ReadStatus;
  rating?: number;
  review?: string;
  seriesId?: string | null;
  seriesVolumeNumber?: number | null;
  workId?: string | null;
  dateAdded: string;
  dateRead?: string | null;
}

export interface SanitizedBookMetadata {
  isbn: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publisher: string;
  publishDate: string;
  pageCount: number;
  workKey: string | null;
}

export interface SeriesVolume {
  volumeNumber: number;
  title: string;
  isbn?: string | null;
  workId?: string | null;
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
