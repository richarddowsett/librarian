import { fetchBooksApi, addBookApi, updateBookApi, deleteBookApi, lookupIsbnApi } from './apiClient';

describe('API Client Unit Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetchBooksApi attaches Authorization bearer header when authToken is passed', async () => {
    const mockBooks = [{ id: 'book-1', title: 'Test Book', ownerId: 'user-1' }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ books: mockBooks }),
    } as Response);

    const books = await fetchBooksApi({ authToken: 'mock-jwt-token-123' });

    expect(books).toEqual(mockBooks);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token-123',
        }),
      })
    );
  });

  it('fetchBooksApi triggers onUnauthorized callback and returns empty array on 401 Unauthorized status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    const onUnauthorized = jest.fn();
    const books = await fetchBooksApi({ authToken: 'expired-token', onUnauthorized });

    expect(books).toEqual([]);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('addBookApi sends POST request with JSON payload', async () => {
    const input = {
      title: 'New Book',
      authors: ['Author A'],
      isbn: '9780000000000',
      readStatus: 'unread' as const,
      dateAdded: '2026-07-27T00:00:00.000Z',
    };

    const mockCreated = { id: 'book-999', ...input, ownerId: 'user-123' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ book: mockCreated }),
    } as Response);

    const result = await addBookApi(input, { authToken: 'mock-token' });

    expect(result).toEqual(mockCreated);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  });

  it('updateBookApi sends PUT request with updated fields', async () => {
    const updates = { rating: 5, readStatus: 'read' as const };
    const mockUpdatedBook = { id: 'book-123', title: 'Sample Book', ...updates, ownerId: 'user-1' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ book: mockUpdatedBook }),
    } as Response);

    const result = await updateBookApi('book-123', updates, { authToken: 'mock-token' });

    expect(result).toEqual(mockUpdatedBook);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/book-123'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    );
  });

  it('deleteBookApi sends DELETE request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);

    const success = await deleteBookApi('book-123', { authToken: 'mock-token' });

    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/book-123'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('lookupIsbnApi encodes ISBN query parameter', async () => {
    const mockOpenLibraryBook = { title: 'Dune', isbn: '9780441172719' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ book: mockOpenLibraryBook }),
    } as Response);

    const book = await lookupIsbnApi('9780441172719');

    expect(book).toEqual(mockOpenLibraryBook);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/open-library/lookup?isbn=9780441172719'),
      expect.anything()
    );
  });
});
