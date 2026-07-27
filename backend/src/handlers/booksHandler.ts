import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getBooksByOwner,
  getBookById,
  putBook,
  updateBook,
  deleteBook,
} from '../services/dynamoService';
import { Book } from '../types';

function getUserId(event: APIGatewayProxyEventV2): string {
  // Extract sub from Cognito JWT Claims
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (claims && typeof claims.sub === 'string') {
    return claims.sub;
  }
  // Fallback for unauthenticated/dev calls if enabled
  return (event.headers && event.headers['x-user-id']) || 'dev-user-12345';
}

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.requestContext.http.path;
  const userId = getUserId(event);
  const pathParameters = event.pathParameters || {};
  const bookId = pathParameters.id;

  try {
    // GET /books - List books for current authenticated user
    if (method === 'GET' && (!bookId || path.endsWith('/books'))) {
      const books = await getBooksByOwner(userId);
      return jsonResponse(200, { success: true, books });
    }

    // GET /books/{id} - Get single book details
    if (method === 'GET' && bookId) {
      const book = await getBookById(userId, bookId);
      if (!book) {
        return jsonResponse(404, { success: false, error: 'Book not found' });
      }
      return jsonResponse(200, { success: true, book });
    }

    // POST /books - Add a new book for current user
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const newBook: Book = {
        ...body,
        id: body.id || `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: userId,
        dateAdded: new Date().toISOString(),
      };
      await putBook(newBook);
      return jsonResponse(201, { success: true, book: newBook });
    }

    // PUT /books/{id} - Update a book
    if (method === 'PUT' && bookId) {
      const updates = JSON.parse(event.body || '{}');
      const updated = await updateBook(userId, bookId, updates);
      if (!updated) {
        return jsonResponse(404, { success: false, error: 'Book not found' });
      }
      return jsonResponse(200, { success: true, book: updated });
    }

    // DELETE /books/{id} - Delete a book
    if (method === 'DELETE' && bookId) {
      await deleteBook(userId, bookId);
      return jsonResponse(200, { success: true, message: 'Book deleted' });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('BooksHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
