import { Book, CreateBookInput } from '../schemas/book';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

export interface ApiOptions {
  authToken?: string;
  userId?: string;
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

export async function fetchBooksApi(options?: ApiOptions): Promise<Book[]> {
  if (!API_BASE_URL) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'GET',
      headers: getHeaders(options),
    });
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
    return response.ok;
  } catch (error) {
    console.error('deleteBookApi Error:', error);
    return false;
  }
}

export async function lookupIsbnApi(isbn: string, options?: ApiOptions): Promise<any | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/open-library/lookup?isbn=${encodeURIComponent(isbn)}`, {
      method: 'GET',
      headers: getHeaders(options),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.book || null;
  } catch (error) {
    console.error('lookupIsbnApi Error:', error);
    return null;
  }
}
