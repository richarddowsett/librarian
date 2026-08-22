import { Book, SeriesDetails } from '../../types';
import {
  addBookForUser,
  deleteBook,
  getAllSeries,
  getBookById,
  getBooksByOwner,
  getSeriesById,
  getUserSeriesStatus,
  getAllUserSeriesStatuses,
  putSeries,
  putUserSeriesStatus,
  updateBook,
} from '../firestoreService';

describe('Database and Firestore Service Operations', () => {
  it('handles series creation and retrieval', async () => {
    const seriesData: SeriesDetails = {
      id: 'series_hp',
      name: 'Harry Potter',
      totalVolumes: 7,
      volumes: [
        { volumeNumber: 1, title: 'Philosopher\'s Stone', isbn: '9780747532699' },
      ],
    };

    await putSeries(seriesData);
    const fetched = await getSeriesById('series_hp');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Harry Potter');

    const allSeries = await getAllSeries();
    expect(allSeries.length).toBeGreaterThan(0);
  });

  it('handles user series status operations', async () => {
    const status = {
      id: 'u1_series_hp',
      userId: 'u1',
      seriesId: 'series_hp',
      isCompleted: true,
      ignoredVolumes: [],
    };

    await putUserSeriesStatus(status);
    const fetched = await getUserSeriesStatus('u1', 'series_hp');
    expect(fetched).not.toBeNull();
    expect(fetched?.isCompleted).toBe(true);

    const allStatuses = await getAllUserSeriesStatuses('u1');
    expect(allStatuses.length).toBe(1);
  });
});
