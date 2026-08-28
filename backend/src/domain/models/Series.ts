export interface SeriesVolume {
  volumeNumber: number;
  title: string;
  authors?: string[] | null;
  isbn?: string | null;
  workId?: string | null;
  coverUrl?: string | null;
}

export interface SeriesDetails {
  id: string;
  name: string;
  openLibraryWorkId?: string | null;
  listUrl?: string | null;
  lastUpdated?: string | null;
  source?: 'openlibrary_list' | 'heuristics';
  volumes: SeriesVolume[];
  totalVolumes: number;
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

export interface OpenLibraryListSummary {
  url: string;
  fullUrl?: string;
  name: string;
  seedCount: number;
  lastUpdate?: string;
}
