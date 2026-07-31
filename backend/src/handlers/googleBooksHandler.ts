import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  fetchBookByISBN,
  fetchAuthorCatalogFromGoogle,
  fetchSeriesCatalogFromGoogle,
} from '../services/googleBooks';

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.rawPath || event.requestContext.http.path;

  try {
    if (method === 'OPTIONS') {
      return jsonResponse(200, { success: true });
    }

    if (method === 'GET') {
      // 1. ISBN Barcode Lookup: GET /google-books/lookup?isbn=...
      if (rawPath.includes('/lookup')) {
        const isbn = event.queryStringParameters?.isbn;
        if (!isbn) {
          return jsonResponse(400, { success: false, error: 'ISBN query parameter is required' });
        }

        const book = await fetchBookByISBN(isbn);
        if (!book) {
          return jsonResponse(404, { success: false, error: 'Book not found on Google Books' });
        }

        return jsonResponse(200, { success: true, book });
      }

      // 2. Author Catalog: GET /google-books/author-catalog?author=...
      if (rawPath.includes('/author-catalog')) {
        const author = event.queryStringParameters?.author;
        if (!author) {
          return jsonResponse(400, { success: false, error: 'Author query parameter is required' });
        }

        const catalog = await fetchAuthorCatalogFromGoogle(author);
        return jsonResponse(200, { success: true, catalog });
      }

      // 3. Series Catalog: GET /google-books/series-catalog?series=...
      if (rawPath.includes('/series-catalog')) {
        const series = event.queryStringParameters?.series;
        if (!series) {
          return jsonResponse(400, { success: false, error: 'Series query parameter is required' });
        }

        const catalog = await fetchSeriesCatalogFromGoogle(series);
        return jsonResponse(200, { success: true, catalog });
      }

      return jsonResponse(404, { success: false, error: 'Endpoint not found' });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('GoogleBooksHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
