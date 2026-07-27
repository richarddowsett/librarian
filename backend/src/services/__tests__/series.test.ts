import { Book, SeriesVolume, UserSeriesStatus } from '../../types';
import {
  calculateSeriesProgress,
  extractVolumeNumber,
  fetchSeriesDetails,
  sanitizeWorkId,
} from '../series';

describe('Series Discovery and Tracking Service', () => {
  describe('sanitizeWorkId', () => {
    it('removes leading /works/ prefix', () => {
      expect(sanitizeWorkId('/works/OL82563W')).toBe('OL82563W');
      expect(sanitizeWorkId('OL82563W')).toBe('OL82563W');
      expect(sanitizeWorkId('')).toBe('');
    });
  });

  describe('extractVolumeNumber', () => {
    it('extracts volume numbers from various title formats', () => {
      expect(extractVolumeNumber('Harry Potter and the Chamber of Secrets (Book 2)')).toBe(2);
      expect(extractVolumeNumber('Dune: Volume 3')).toBe(3);
      expect(extractVolumeNumber('Berserk #4')).toBe(4);
      expect(extractVolumeNumber('The Dark Tower v5')).toBe(5);
      expect(extractVolumeNumber('Standalone Novel')).toBeNull();
    });
  });

  describe('fetchSeriesDetails', () => {
    it('resolves series details and volume list from Open Library', async () => {
      const mockWorkResponse = {
        title: 'Harry Potter and the Sorcerer\'s Stone',
        series: ['Harry Potter'],
      };

      const mockSearchResponse = {
        docs: [
          { title: 'Harry Potter and the Sorcerer\'s Stone (Book 1)', key: '/works/OL82563W', isbn: ['9780545010221'] },
          { title: 'Harry Potter and the Chamber of Secrets (Book 2)', key: '/works/OL82564W', isbn: ['9780439064873'] },
          { title: 'Harry Potter and the Prisoner of Azkaban (Book 3)', key: '/works/OL82565W', isbn: ['9780439136358'] },
        ],
      };

      const mockFetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/works/')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockWorkResponse,
          });
        }
        if (url.includes('/search.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSearchResponse,
          });
        }
        return Promise.resolve({ ok: false });
      });

      const series = await fetchSeriesDetails('OL82563W', mockFetch as any);

      expect(series).not.toBeNull();
      expect(series?.name).toBe('Harry Potter');
      expect(series?.totalVolumes).toBe(3);
      expect(series?.volumes[0].volumeNumber).toBe(1);
      expect(series?.volumes[1].volumeNumber).toBe(2);
      expect(series?.volumes[2].volumeNumber).toBe(3);
    });

    it('returns null when work fetch returns HTTP error', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      const series = await fetchSeriesDetails('INVALID_WORK', mockFetch as any);
      expect(series).toBeNull();
    });

    it('handles network throw exception gracefully returning null', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const series = await fetchSeriesDetails('OL82563W', mockFetch as any);
      expect(series).toBeNull();
    });
  });

  describe('calculateSeriesProgress', () => {
    const seriesVolumes: SeriesVolume[] = [
      { volumeNumber: 1, title: 'Vol 1', isbn: '9780000000001', workId: 'WORK1' },
      { volumeNumber: 2, title: 'Vol 2', isbn: '9780000000002', workId: 'WORK2' },
      { volumeNumber: 3, title: 'Vol 3', isbn: '9780000000003', workId: 'WORK3' },
      { volumeNumber: 4, title: 'Vol 4', isbn: '9780000000004', workId: 'WORK4' },
    ];

    const sampleBooks: Book[] = [
      {
        id: 'b1',
        ownerId: 'user1',
        isbn: '9780000000001',
        title: 'Vol 1',
        authors: ['Author A'],
        coverUrl: null,
        publisher: 'Pub',
        publishDate: '2020',
        pageCount: 300,
        readStatus: 'read',
        seriesId: 'series_1',
        seriesVolumeNumber: 1,
        workId: 'WORK1',
        dateAdded: '2026-01-01',
      },
      {
        id: 'b2',
        ownerId: 'user1',
        isbn: '9780000000002',
        title: 'Vol 2',
        authors: ['Author A'],
        coverUrl: null,
        publisher: 'Pub',
        publishDate: '2021',
        pageCount: 320,
        readStatus: 'reading',
        seriesId: 'series_1',
        seriesVolumeNumber: 2,
        workId: 'WORK2',
        dateAdded: '2026-01-02',
      },
    ];

    it('calculates partial progress (50% completed, in_progress status)', () => {
      const progress = calculateSeriesProgress(sampleBooks, seriesVolumes);

      expect(progress.totalVolumes).toBe(4);
      expect(progress.ownedCount).toBe(2);
      expect(progress.missingCount).toBe(2);
      expect(progress.ownedPercentage).toBe(50.0);
      expect(progress.isCompleted).toBe(false);
      expect(progress.wishlistStatus).toBe('in_progress');
      expect(progress.missingVolumes).toHaveLength(2);
      expect(progress.missingVolumes[0].volumeNumber).toBe(3);
      expect(progress.missingVolumes[1].volumeNumber).toBe(4);
    });

    it('calculates 100% completion when all volumes are owned', () => {
      const allOwnedBooks: Book[] = [
        ...sampleBooks,
        { ...sampleBooks[0], id: 'b3', seriesVolumeNumber: 3, isbn: '9780000000003', workId: 'WORK3' },
        { ...sampleBooks[0], id: 'b4', seriesVolumeNumber: 4, isbn: '9780000000004', workId: 'WORK4' },
      ];

      const progress = calculateSeriesProgress(allOwnedBooks, seriesVolumes);

      expect(progress.totalVolumes).toBe(4);
      expect(progress.ownedCount).toBe(4);
      expect(progress.missingCount).toBe(0);
      expect(progress.ownedPercentage).toBe(100.0);
      expect(progress.isCompleted).toBe(true);
      expect(progress.wishlistStatus).toBe('completed');
      expect(progress.missingVolumes).toHaveLength(0);
    });

    it('calculates 0% progress when no volumes are owned', () => {
      const progress = calculateSeriesProgress([], seriesVolumes);

      expect(progress.totalVolumes).toBe(4);
      expect(progress.ownedCount).toBe(0);
      expect(progress.missingCount).toBe(4);
      expect(progress.ownedPercentage).toBe(0);
      expect(progress.isCompleted).toBe(false);
      expect(progress.wishlistStatus).toBe('not_started');
      expect(progress.missingVolumes).toHaveLength(4);
    });

    it('excludes user ignored volumes from wishlist and missing volume count', () => {
      const userStatus: UserSeriesStatus = {
        id: 'u_series_1',
        userId: 'user1',
        seriesId: 'series_1',
        isCompleted: false,
        ignoredVolumes: ['3', '4'], // Volume 3 and 4 ignored by user
      };

      const progress = calculateSeriesProgress(sampleBooks, seriesVolumes, userStatus);

      expect(progress.totalVolumes).toBe(2);
      expect(progress.ownedCount).toBe(2);
      expect(progress.missingCount).toBe(0);
      expect(progress.ownedPercentage).toBe(100.0);
      expect(progress.isCompleted).toBe(true);
      expect(progress.wishlistStatus).toBe('completed');
      expect(progress.missingVolumes).toHaveLength(0);
    });
  });
});
