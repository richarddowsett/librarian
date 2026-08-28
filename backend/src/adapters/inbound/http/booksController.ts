import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BookUseCases } from '../../../ports/inbound/BookUseCases';

function getUserId(event: APIGatewayProxyEventV2): string {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (claims && typeof claims.sub === 'string') {
    return claims.sub;
  }
  return (event.headers && (event.headers['x-user-id'] || event.headers['X-User-Id'])) || 'dev-user-12345';
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

export class BooksController {
  constructor(private bookUseCases: BookUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const userId = getUserId(event);
    const pathParameters = event.pathParameters || {};
    const bookId = pathParameters.id;

    try {
      if (method === 'GET' && (!bookId || path.endsWith('/books'))) {
        const books = await this.bookUseCases.getBooks(userId);
        return jsonResponse(200, { success: true, books });
      }

      if (method === 'GET' && bookId) {
        const book = await this.bookUseCases.getBookById(userId, bookId);
        if (!book) {
          return jsonResponse(404, { success: false, error: 'Book not found' });
        }
        return jsonResponse(200, { success: true, book });
      }

      if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const book = await this.bookUseCases.addBook(userId, body);
        return jsonResponse(201, { success: true, book });
      }

      if (method === 'PUT' && bookId) {
        const updates = JSON.parse(event.body || '{}');
        const updated = await this.bookUseCases.updateBook(userId, bookId, updates);
        if (!updated) {
          return jsonResponse(404, { success: false, error: 'Book not found' });
        }
        return jsonResponse(200, { success: true, book: updated });
      }

      if (method === 'DELETE' && bookId) {
        await this.bookUseCases.deleteBook(userId, bookId);
        return jsonResponse(200, { success: true, message: 'Book deleted' });
      }

      return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
    } catch (error: any) {
      console.error('BooksController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
