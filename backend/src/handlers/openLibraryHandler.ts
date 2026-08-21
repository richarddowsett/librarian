import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { fetchBookByISBN, fetchTopListsForWork } from '../services/openLibrary';

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
  const isbn = event.queryStringParameters?.isbn;
  const workId = event.queryStringParameters?.workId;

  try {
    if (method === 'GET') {
      if (workId) {
        const lists = await fetchTopListsForWork(workId);
        return jsonResponse(200, { success: true, lists });
      }

      if (isbn) {
        const book = await fetchBookByISBN(isbn);
        if (!book) {
          return jsonResponse(404, { success: false, error: 'Book not found on Open Library' });
        }
        return jsonResponse(200, { success: true, book });
      }

      return jsonResponse(400, { success: false, error: 'Either isbn or workId query parameter is required' });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('OpenLibraryHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
