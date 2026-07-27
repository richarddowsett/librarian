import { Book, SeriesDetails, UserSeriesStatus } from '../types';

/**
 * In-memory fallback mock storage for offline / dev mode.
 */
class LocalMockDatabase {
  books: Map<string, Book> = new Map();
  series: Map<string, SeriesDetails> = new Map();
  userSeriesStatus: Map<string, UserSeriesStatus> = new Map();

  reset() {
    this.books.clear();
    this.series.clear();
    this.userSeriesStatus.clear();
  }
}

const mockDb = new LocalMockDatabase();

let isOfflineOrDevMode = true; // Default to dev/mock mode unless explicitly connected to Firestore
let firestoreInstance: any = null;

/**
 * Configures the mode for Firestore services.
 */
export function setDevOrOfflineMode(offline: boolean, firestoreDb?: any) {
  isOfflineOrDevMode = offline;
  firestoreInstance = firestoreDb || null;
}

/**
 * Checks if the service is running in mock/offline mode.
 */
export function isOfflineMode(): boolean {
  return isOfflineOrDevMode || !firestoreInstance;
}

/**
 * Resets the in-memory mock database (useful for unit testing).
 */
export function resetMockDatabase(): void {
  mockDb.reset();
}

// ----------------------------------------------------
// BOOK CRUD OPERATIONS
// ----------------------------------------------------

export async function addBook(bookData: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
  const newId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dateAdded = new Date().toISOString();

  const newBook: Book = {
    ...bookData,
    id: newId,
    dateAdded,
  };

  if (isOfflineMode()) {
    mockDb.books.set(newId, newBook);
    return newBook;
  }

  try {
    // If Firestore instance is active
    const docRef = firestoreInstance.collection('books').doc(newId);
    await docRef.set(newBook);
    return newBook;
  } catch (error) {
    // Fallback to mock state if Firestore write fails
    mockDb.books.set(newId, newBook);
    return newBook;
  }
}

export async function getBooks(userId: string): Promise<Book[]> {
  if (isOfflineMode()) {
    return Array.from(mockDb.books.values()).filter((b) => b.ownerId === userId);
  }

  try {
    const snapshot = await firestoreInstance.collection('books').where('ownerId', '==', userId).get();
    const books: Book[] = [];
    snapshot.forEach((doc: any) => books.push(doc.data() as Book));
    return books;
  } catch (error) {
    return Array.from(mockDb.books.values()).filter((b) => b.ownerId === userId);
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  if (isOfflineMode()) {
    return mockDb.books.get(id) || null;
  }

  try {
    const doc = await firestoreInstance.collection('books').doc(id).get();
    return doc.exists ? (doc.data() as Book) : null;
  } catch (error) {
    return mockDb.books.get(id) || null;
  }
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book | null> {
  if (isOfflineMode()) {
    const existing = mockDb.books.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockDb.books.set(id, updated);
    return updated;
  }

  try {
    const docRef = firestoreInstance.collection('books').doc(id);
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return updatedDoc.data() as Book;
  } catch (error) {
    const existing = mockDb.books.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockDb.books.set(id, updated);
    return updated;
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  if (isOfflineMode()) {
    return mockDb.books.delete(id);
  }

  try {
    await firestoreInstance.collection('books').doc(id).delete();
    mockDb.books.delete(id);
    return true;
  } catch (error) {
    return mockDb.books.delete(id);
  }
}

// ----------------------------------------------------
// SERIES CRUD OPERATIONS
// ----------------------------------------------------

export async function addSeries(seriesData: Omit<SeriesDetails, 'id'>): Promise<SeriesDetails> {
  const newId = seriesData.openLibraryWorkId
    ? `series_${seriesData.openLibraryWorkId}`
    : `series_${Date.now()}`;

  const newSeries: SeriesDetails = {
    ...seriesData,
    id: newId,
  };

  if (isOfflineMode()) {
    mockDb.series.set(newId, newSeries);
    return newSeries;
  }

  try {
    await firestoreInstance.collection('series').doc(newId).set(newSeries);
    return newSeries;
  } catch (error) {
    mockDb.series.set(newId, newSeries);
    return newSeries;
  }
}

export async function getSeries(seriesId: string): Promise<SeriesDetails | null> {
  if (isOfflineMode()) {
    return mockDb.series.get(seriesId) || null;
  }

  try {
    const doc = await firestoreInstance.collection('series').doc(seriesId).get();
    return doc.exists ? (doc.data() as SeriesDetails) : null;
  } catch (error) {
    return mockDb.series.get(seriesId) || null;
  }
}

export async function getAllSeries(): Promise<SeriesDetails[]> {
  if (isOfflineMode()) {
    return Array.from(mockDb.series.values());
  }

  try {
    const snapshot = await firestoreInstance.collection('series').get();
    const seriesList: SeriesDetails[] = [];
    snapshot.forEach((doc: any) => seriesList.push(doc.data() as SeriesDetails));
    return seriesList;
  } catch (error) {
    return Array.from(mockDb.series.values());
  }
}

export async function updateSeries(
  seriesId: string,
  updates: Partial<SeriesDetails>
): Promise<SeriesDetails | null> {
  if (isOfflineMode()) {
    const existing = mockDb.series.get(seriesId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockDb.series.set(seriesId, updated);
    return updated;
  }

  try {
    const docRef = firestoreInstance.collection('series').doc(seriesId);
    await docRef.update(updates);
    const doc = await docRef.get();
    return doc.data() as SeriesDetails;
  } catch (error) {
    const existing = mockDb.series.get(seriesId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockDb.series.set(seriesId, updated);
    return updated;
  }
}

// ----------------------------------------------------
// USER SERIES STATUS CRUD OPERATIONS
// ----------------------------------------------------

export async function getUserSeriesStatus(
  userId: string,
  seriesId: string
): Promise<UserSeriesStatus | null> {
  const key = `${userId}_${seriesId}`;
  if (isOfflineMode()) {
    return mockDb.userSeriesStatus.get(key) || null;
  }

  try {
    const doc = await firestoreInstance.collection('userSeriesStatus').doc(key).get();
    return doc.exists ? (doc.data() as UserSeriesStatus) : null;
  } catch (error) {
    return mockDb.userSeriesStatus.get(key) || null;
  }
}

export async function updateUserSeriesStatus(
  userId: string,
  seriesId: string,
  updates: Partial<UserSeriesStatus>
): Promise<UserSeriesStatus> {
  const key = `${userId}_${seriesId}`;
  const existing = (await getUserSeriesStatus(userId, seriesId)) || {
    id: key,
    userId,
    seriesId,
    isCompleted: false,
    ignoredVolumes: [],
  };

  const updatedStatus: UserSeriesStatus = {
    ...existing,
    ...updates,
  };

  if (isOfflineMode()) {
    mockDb.userSeriesStatus.set(key, updatedStatus);
    return updatedStatus;
  }

  try {
    await firestoreInstance.collection('userSeriesStatus').doc(key).set(updatedStatus, { merge: true });
    return updatedStatus;
  } catch (error) {
    mockDb.userSeriesStatus.set(key, updatedStatus);
    return updatedStatus;
  }
}

export async function getUserAllSeriesStatus(userId: string): Promise<UserSeriesStatus[]> {
  if (isOfflineMode()) {
    return Array.from(mockDb.userSeriesStatus.values()).filter((st) => st.userId === userId);
  }

  try {
    const snapshot = await firestoreInstance
      .collection('userSeriesStatus')
      .where('userId', '==', userId)
      .get();
    const statusList: UserSeriesStatus[] = [];
    snapshot.forEach((doc: any) => statusList.push(doc.data() as UserSeriesStatus));
    return statusList;
  } catch (error) {
    return Array.from(mockDb.userSeriesStatus.values()).filter((st) => st.userId === userId);
  }
}
