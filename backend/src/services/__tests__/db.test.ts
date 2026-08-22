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

const firestoreStore: Record<string, Record<string, any>> = {
  users: {},
  books: {},
  userLibrary: {},
  series: {},
  userSeriesStatus: {},
};

jest.mock('firebase-admin', () => {
  const mockDoc = (collectionName: string, id: string) => ({
    get: jest.fn().mockImplementation(async () => ({
      exists: Boolean(firestoreStore[collectionName]?.[id]),
      data: () => firestoreStore[collectionName]?.[id],
    })),
    set: jest.fn().mockImplementation(async (data: any) => {
      if (!firestoreStore[collectionName]) firestoreStore[collectionName] = {};
      firestoreStore[collectionName][id] = { ...(firestoreStore[collectionName][id] || {}), ...data };
    }),
    delete: jest.fn().mockImplementation(async () => {
      if (firestoreStore[collectionName]) {
        delete firestoreStore[collectionName][id];
      }
    }),
  });

  const mockCollection = (collectionName: string) => ({
    doc: (id: string) => mockDoc(collectionName, id),
    where: (field: string, op: string, value: any) => ({
      get: jest.fn().mockImplementation(async () => {
        const docs = Object.values(firestoreStore[collectionName] || {})
          .filter((item) => item[field] === value)
          .map((data) => ({ data: () => data }));
        return { empty: docs.length === 0, docs };
      }),
    }),
    get: jest.fn().mockImplementation(async () => {
      const docs = Object.values(firestoreStore[collectionName] || {}).map((data) => ({
        data: () => data,
      }));
      return { size: docs.length, docs };
    }),
  });

  return {
    apps: ['mock-app'],
    initializeApp: jest.fn(),
    firestore: () => ({
      collection: (name: string) => mockCollection(name),
    }),
  };
});

describe('Database and Firestore Service Operations', () => {
  beforeEach(() => {
    firestoreStore.users = {};
    firestoreStore.books = {};
    firestoreStore.userLibrary = {};
    firestoreStore.series = {};
    firestoreStore.userSeriesStatus = {};
  });

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
