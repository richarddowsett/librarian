import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getBooksByUser,
  addBookForUser,
  updateUserBook,
  deleteUserBook,
} from '../services/db';

function getUserId(event: APIGatewayProxyEventV2): string {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (claims && typeof claims.sub === 'string') {
    return claims.sub;
  }
  return (event.headers && event.headers['x-user-id']) || '';
}

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.requestContext.http.path;
  const userId = getUserId(event);

  if (!userId) {
    return jsonResponse(401, { success: false, error: 'Unauthorized: missing user claim' });
  }

  const pathParameters = event.pathParameters || {};
  const bookId = pathParameters.id;

  try {
    if (method === 'OPTIONS') {
      return jsonResponse(200, { success: true });
    }

    // GET /books - List books for current authenticated user
    if (method === 'GET' && (!bookId || path.endsWith('/books'))) {
      const books = await getBooksByUser(userId);
      return jsonResponse(200, { success: true, books });
    }

    // POST /books - Add a new book for current user (deduplicating against internal shared books table)
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const book = await addBookForUser(userId, body);
      return jsonResponse(201, { success: true, book });
    }

    // PUT /books/{id} - Update user book rating / review / read status
    if (method === 'PUT' && bookId) {
      const updates = JSON.parse(event.body || '{}');
      const updated = await updateUserBook(userId, bookId, updates);
      if (!updated) {
        return jsonResponse(404, { success: false, error: 'Book not found' });
      }
      return jsonResponse(200, { success: true, book: updated });
    }

    // DELETE /books/{id} - Delete book association for user
    if (method === 'DELETE' && bookId) {
      const deleted = await deleteUserBook(userId, bookId);
      if (!deleted) {
        return jsonResponse(404, { success: false, error: 'Book not found' });
      }
      return jsonResponse(200, { success: true, message: 'Book deleted' });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('BooksHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
