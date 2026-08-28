import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ExternalCatalogUseCases } from '../../../ports/inbound/ExternalCatalogUseCases';

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export class GoogleBooksController {
  constructor(private externalCatalogUseCases: ExternalCatalogUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const queryParams = event.queryStringParameters || {};

    try {
      if (method !== 'GET') {
        return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
      }

      if (path.includes('/google-books/lookup')) {
        const isbn = queryParams.isbn || '';
        if (!isbn) return jsonResponse(400, { success: false, error: 'ISBN is required' });

        const book = await this.externalCatalogUseCases.lookupIsbn(isbn);
        if (!book) return jsonResponse(404, { success: false, error: 'Book not found' });
        return jsonResponse(200, { success: true, book });
      }

      if (path.includes('/google-books/author-catalog')) {
        const author = queryParams.author || '';
        if (!author) return jsonResponse(400, { success: false, error: 'Author is required' });

        const catalog = await this.externalCatalogUseCases.fetchAuthorCatalog(author);
        return jsonResponse(200, { success: true, catalog });
      }

      if (path.includes('/google-books/series-catalog')) {
        const series = queryParams.series || '';
        if (!series) return jsonResponse(400, { success: false, error: 'Series is required' });

        const catalog = await this.externalCatalogUseCases.fetchSeriesCatalog(series);
        return jsonResponse(200, { success: true, catalog });
      }

      if (path.includes('/google-books/search')) {
        const title = queryParams.title || '';
        const author = queryParams.author || undefined;
        if (!title) return jsonResponse(400, { success: false, error: 'Title is required' });

        const results = await this.externalCatalogUseCases.searchBooks(title, author);
        return jsonResponse(200, { success: true, results });
      }

      return jsonResponse(404, { success: false, error: 'Endpoint not found' });
    } catch (error: any) {
      console.error('GoogleBooksController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
