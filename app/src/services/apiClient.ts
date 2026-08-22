import { Book, CreateBookInput } from '../schemas/book';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.shelfd.app';

export interface ApiOptions {
  authToken?: string;
  userId?: string;
  onUnauthorized?: () => void;
}

function getHeaders(options?: ApiOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }
  if (options?.userId) {
    headers['x-user-id'] = options.userId;
  }

  return headers;
}

function checkUnauthorized(response: Response, options?: ApiOptions): boolean {
  if (response.status === 401 || response.status === 403) {
    console.warn(`API returned ${response.status} Unauthorized for URL: ${response.url}`);
    if (options?.onUnauthorized) {
      options.onUnauthorized();
    }
    return true;
  }
  return false;
}

export async function fetchBooksApi(options?: ApiOptions): Promise<Book[]> {
  if (!API_BASE_URL) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'GET',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) {
      return [];
    }

    if (!response.ok) return [];
    const data = await response.json();
    return data.books || [];
  } catch (error) {
    console.error('fetchBooksApi Error:', error);
    return [];
  }
}

export async function addBookApi(input: Omit<CreateBookInput, 'ownerId'>, options?: ApiOptions): Promise<Book | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: getHeaders(options),
      body: JSON.stringify(input),
    });

    if (checkUnauthorized(response, options)) {
      return null;
    }

    if (!response.ok) return null;
    const data = await response.json();
    return data.book || null;
  } catch (error) {
    console.error('addBookApi Error:', error);
    return null;
  }
}

export async function updateBookApi(id: string, updates: Partial<Book>, options?: ApiOptions): Promise<Book | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: getHeaders(options),
      body: JSON.stringify(updates),
    });

    if (checkUnauthorized(response, options)) {
      return null;
    }

    if (!response.ok) return null;
    const data = await response.json();
    return data.book || null;
  } catch (error) {
    console.error('updateBookApi Error:', error);
    return null;
  }
}

export async function deleteBookApi(id: string, options?: ApiOptions): Promise<boolean> {
  if (!API_BASE_URL) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) {
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('deleteBookApi Error:', error);
    return false;
  }
}

export async function lookupIsbnApi(isbn: string, options?: ApiOptions): Promise<any | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/google-books/lookup?isbn=${encodeURIComponent(isbn)}`, {
      method: 'GET',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) {
      return null;
    }

    if (!response.ok) return null;
    const data = await response.json();
    return data.book || null;
  } catch (error) {
    console.error('lookupIsbnApi Error:', error);
    return null;
  }
}

export async function fetchAuthorCatalogApi(author: string, options?: ApiOptions): Promise<any[]> {
  if (!API_BASE_URL) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/google-books/author-catalog?author=${encodeURIComponent(author)}`, {
      method: 'GET',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) return [];
    if (!response.ok) return [];
    const data = await response.json();
    return data.catalog || [];
  } catch (error) {
    console.error('fetchAuthorCatalogApi Error:', error);
    return [];
  }
}

export async function fetchSeriesCatalogApi(series: string, options?: ApiOptions): Promise<any[]> {
  if (!API_BASE_URL) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/google-books/series-catalog?series=${encodeURIComponent(series)}`, {
      method: 'GET',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) return [];
    if (!response.ok) return [];
    const data = await response.json();
    return data.catalog || [];
  } catch (error) {
    console.error('fetchSeriesCatalogApi Error:', error);
    return [];
  }
}

export interface OpenLibraryListSummary {
  url: string;
  fullUrl?: string;
  name: string;
  seedCount: number;
  lastUpdate?: string;
}

export async function fetchWorkListsApi(workIdOrIsbn: string, options?: ApiOptions): Promise<OpenLibraryListSummary[]> {
  let cleanId = workIdOrIsbn.replace(/^\/works\//, '').trim();
  if (!cleanId) return [];

  // Try API Gateway endpoint first if available
  if (API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/open-library/work-lists?workId=${encodeURIComponent(cleanId)}`, {
        method: 'GET',
        headers: getHeaders(options),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.lists)) {
          return data.lists;
        }
      }
    } catch (e) {
      // Fallback directly to Open Library API
    }
  }

  // If cleanId is an ISBN (10/13 digits), resolve OpenLibrary workId first before querying fallback URL!
  if (/^(?:\d{9}[\dX]|\d{13})$/i.test(cleanId.replace(/[-\s]/g, ''))) {
    try {
      const isbnClean = cleanId.replace(/[-\s]/g, '').toUpperCase();
      const bibRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&jscmd=data&format=json`, {
        headers: { Accept: 'application/json' },
      });
      if (bibRes.ok) {
        const bibData = await bibRes.json();
        const raw = bibData[`ISBN:${isbnClean}`];
        if (raw && Array.isArray(raw.works) && raw.works[0]?.key) {
          cleanId = raw.works[0].key.replace(/^\/works\//, '');
        }
      }
    } catch (err) {
      // Ignore fallback resolution error
    }
  }

  // Fallback direct Open Library call
  try {
    const res = await fetch(`https://openlibrary.org/works/${cleanId}/lists.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.entries || !Array.isArray(data.entries)) return [];
    const lists: OpenLibraryListSummary[] = data.entries.map((item: any) => ({
      url: item.url || item.full_url || '',
      fullUrl: item.full_url || item.url || '',
      name: (item.name || 'Untitled List').trim(),
      seedCount: typeof item.seed_count === 'number' ? item.seed_count : 0,
      lastUpdate: item.last_update || undefined,
    }));
    return lists.sort((a, b) => b.seedCount - a.seedCount).slice(0, 3);
  } catch (err) {
    console.error('fetchWorkListsApi error:', err);
    return [];
  }
}

export async function importSeriesListApi(
  listUrl: string,
  listName: string,
  workId?: string,
  options?: ApiOptions
): Promise<any | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/series`, {
      method: 'POST',
      headers: getHeaders(options),
      body: JSON.stringify({
        listUrl,
        listName,
        workId,
      }),
    });

    if (checkUnauthorized(response, options)) return null;
    if (!response.ok) return null;
    const data = await response.json();
    return data.series || null;
  } catch (error) {
    console.error('importSeriesListApi Error:', error);
    return null;
  }
}

export async function fetchAllSeriesApi(options?: ApiOptions): Promise<any[]> {
  if (!API_BASE_URL) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/series`, {
      method: 'GET',
      headers: getHeaders(options),
    });

    if (checkUnauthorized(response, options)) return [];
    if (!response.ok) return [];
    const data = await response.json();
    return data.series || [];
  } catch (error) {
    console.error('fetchAllSeriesApi Error:', error);
    return [];
  }
}
