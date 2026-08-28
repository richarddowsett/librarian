import { Book } from '../models/Book';
import { SeriesDetails, SeriesVolume, SeriesProgress } from '../models/Series';
import { UserSeriesStatus } from '../models/UserSeriesStatus';

export function extractVolumeNumber(title: string): number | null {
  if (!title) return null;
  const regexes = [
    /(?:book|vol|volume|v\.)\s*#?\s*(\d+)/i,
    /#\s*(\d+)/,
    /\((\d+)\)/,
    /(?:^|\s)v(\d+)(?:\s|$)/i,
  ];

  for (const regex of regexes) {
    const match = title.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return null;
}

export function calculateSeriesProgress(
  series: SeriesDetails,
  userBooks: Book[],
  userStatus?: UserSeriesStatus | null
): SeriesProgress {
  const ignoredVolumes = new Set(userStatus?.ignoredVolumes || []);
  const volumes = series.volumes || [];

  const ownedVolumes: SeriesVolume[] = [];
  const missingVolumes: SeriesVolume[] = [];

  for (const vol of volumes) {
    const volNumStr = String(vol.volumeNumber);
    if (ignoredVolumes.has(volNumStr)) {
      continue;
    }

    const isOwned = userBooks.some((book) => {
      if (book.seriesId && book.seriesId === series.id) {
        if (book.seriesVolumeNumber === vol.volumeNumber) return true;
      }
      if (vol.isbn && book.isbn === vol.isbn) return true;
      if (vol.title && book.title.toLowerCase().trim() === vol.title.toLowerCase().trim()) return true;
      return false;
    });

    if (isOwned) {
      ownedVolumes.push(vol);
    } else {
      missingVolumes.push(vol);
    }
  }

  const activeTotal = ownedVolumes.length + missingVolumes.length;
  const ownedCount = ownedVolumes.length;
  const missingCount = missingVolumes.length;
  const ownedPercentage = activeTotal > 0 ? Math.round((ownedCount / activeTotal) * 100) : 0;

  const isCompleted = userStatus?.isCompleted || (activeTotal > 0 && missingCount === 0);

  let wishlistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
  if (isCompleted) {
    wishlistStatus = 'completed';
  } else if (ownedCount > 0) {
    wishlistStatus = 'in_progress';
  }

  return {
    seriesId: series.id,
    seriesName: series.name,
    totalVolumes: activeTotal,
    ownedCount,
    missingCount,
    ownedPercentage,
    ownedVolumes,
    missingVolumes,
    isCompleted,
    wishlistStatus,
  };
}
