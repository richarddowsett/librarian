import { Book, SeriesDetails, SeriesProgress, SeriesVolume, UserSeriesStatus } from '../types';

/**
 * Sanitizes a work ID by stripping any leading '/works/' prefix.
 */
export function sanitizeWorkId(workId: string): string {
  if (!workId) return '';
  return workId.replace(/^\/works\//, '').trim();
}

/**
 * Attempts to extract a volume number from a book/work title string or series tag.
 * Examples: "Harry Potter and the Chamber of Secrets (Book 2)" -> 2
 * "Volume 3: The Return" -> 3
 * "#4" -> 4
 */
export function extractVolumeNumber(titleOrSeries: string): number | null {
  if (!titleOrSeries) return null;

  // Patterns for "Book 2", "Vol 3", "Vol. 4", "Volume 5", "#6", "(7)"
  const regexes = [
    /(?:book|vol|volume|v\.)\s*#?\s*(\d+)/i,
    /#\s*(\d+)/,
    /\((\d+)\)/,
    /(?:^|\s)v(\d+)(?:\s|$)/i,
  ];

  for (const regex of regexes) {
    const match = titleOrSeries.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return null;
}

/**
 * Fetches series details for a given workId from Open Library API.
 * Uses fallback heuristics when Open Library series metadata is sparse or missing.
 */
export async function fetchSeriesDetails(
  workId: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SeriesDetails | null> {
  const cleanId = sanitizeWorkId(workId);
  if (!cleanId) return null;

  try {
    // 1. Fetch work details from Open Library
    const workUrl = `https://openlibrary.org/works/${cleanId}.json`;
    const response = await fetchFn(workUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LibrarianApp/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const workData = await response.json();
    const mainTitle: string = workData.title || 'Unknown Work';

    // 2. Discover series name from series property, subjects, or title heuristics
    let seriesName: string | null = null;
    if (Array.isArray(workData.series) && workData.series.length > 0) {
      seriesName = typeof workData.series[0] === 'string' ? workData.series[0] : workData.series[0]?.name;
    }

    if (!seriesName && Array.isArray(workData.subjects)) {
      const seriesSubject = workData.subjects.find(
        (s: any) => typeof s === 'string' && (s.toLowerCase().startsWith('series:') || s.toLowerCase().includes('series'))
      );
      if (seriesSubject) {
        seriesName = seriesSubject.replace(/^series:\s*/i, '').trim();
      }
    }

    // Fallback: Use work title minus volume descriptors as potential series name
    if (!seriesName) {
      seriesName = mainTitle.replace(/,?\s*(?:book|vol|volume|#)\s*\d+.*$/i, '').trim();
    }

    // 3. Search Open Library for all volumes in this series
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(seriesName)}&limit=20`;
    const searchResponse = await fetchFn(searchUrl, {
      headers: { 'Accept': 'application/json' },
    });

    const volumesMap = new Map<number, SeriesVolume>();

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const docs: any[] = searchData.docs || [];

      docs.forEach((doc) => {
        const title: string = doc.title || '';
        const volNum = extractVolumeNumber(title) || doc.series_number || null;
        const docWorkId = doc.key ? sanitizeWorkId(doc.key) : null;
        const isbn = Array.isArray(doc.isbn) && doc.isbn.length > 0 ? doc.isbn[0] : null;

        if (volNum && volNum > 0 && !volumesMap.has(volNum)) {
          volumesMap.set(volNum, {
            volumeNumber: volNum,
            title,
            isbn,
            workId: docWorkId,
          });
        }
      });
    }

    // If search produced volumes, sort them by volume number
    const volumes = Array.from(volumesMap.values()).sort((a, b) => a.volumeNumber - b.volumeNumber);

    // Fallback if no specific volumes discovered
    if (volumes.length === 0) {
      const volNum = extractVolumeNumber(mainTitle) || 1;
      volumes.push({
        volumeNumber: volNum,
        title: mainTitle,
        workId: cleanId,
      });
    }

    return {
      id: `series_${cleanId}`,
      name: seriesName,
      openLibraryWorkId: cleanId,
      volumes,
      totalVolumes: volumes.length,
    };
  } catch (error) {
    // Return null on catastrophic network/parsing failure
    return null;
  }
}

/**
 * Calculates series progress, owned percentage, missing volumes wishlist, and status.
 */
export function calculateSeriesProgress(
  ownedBooks: Book[],
  seriesVolumes: SeriesVolume[],
  userSeriesStatus?: UserSeriesStatus | null
): SeriesProgress {
  if (!seriesVolumes || seriesVolumes.length === 0) {
    return {
      seriesId: userSeriesStatus?.seriesId || 'unknown',
      seriesName: 'Unknown Series',
      totalVolumes: 0,
      ownedCount: 0,
      missingCount: 0,
      ownedPercentage: 0,
      ownedVolumes: [],
      missingVolumes: [],
      isCompleted: false,
      wishlistStatus: 'not_started',
    };
  }

  const ignoredSet = new Set<string>(
    userSeriesStatus?.ignoredVolumes?.map((v) => String(v).toLowerCase()) || []
  );

  // Filter series volumes to exclude user-ignored volumes
  const activeVolumes = seriesVolumes.filter((vol) => {
    const isVolNumIgnored = ignoredSet.has(String(vol.volumeNumber));
    const isIsbnIgnored = vol.isbn ? ignoredSet.has(vol.isbn.toLowerCase()) : false;
    return !isVolNumIgnored && !isIsbnIgnored;
  });

  const ownedVolumes: SeriesVolume[] = [];
  const missingVolumes: SeriesVolume[] = [];

  for (const volume of activeVolumes) {
    const isOwned = ownedBooks.some((book) => {
      // 1. Match by volume number if specified
      if (book.seriesVolumeNumber === volume.volumeNumber) {
        return true;
      }
      // 2. Match by ISBN
      if (book.isbn && volume.isbn && book.isbn.toUpperCase() === volume.isbn.toUpperCase()) {
        return true;
      }
      // 3. Match by Open Library workId
      if (book.workId && volume.workId && sanitizeWorkId(book.workId) === sanitizeWorkId(volume.workId)) {
        return true;
      }
      // 4. Match by exact title ignoring case
      if (book.title && volume.title && book.title.trim().toLowerCase() === volume.title.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    if (isOwned) {
      ownedVolumes.push(volume);
    } else {
      missingVolumes.push(volume);
    }
  }

  const totalVolumes = activeVolumes.length;
  const ownedCount = ownedVolumes.length;
  const missingCount = missingVolumes.length;

  const rawPercentage = totalVolumes > 0 ? (ownedCount / totalVolumes) * 100 : 0;
  const ownedPercentage = Math.round(rawPercentage * 10) / 10;

  const isCompleted = ownedCount >= totalVolumes && totalVolumes > 0;

  let wishlistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
  if (isCompleted) {
    wishlistStatus = 'completed';
  } else if (ownedCount > 0) {
    wishlistStatus = 'in_progress';
  }

  return {
    seriesId: userSeriesStatus?.seriesId || 'unknown_series',
    seriesName: 'Series Progress',
    totalVolumes,
    ownedCount,
    missingCount,
    ownedPercentage,
    ownedVolumes,
    missingVolumes,
    isCompleted,
    wishlistStatus,
  };
}
