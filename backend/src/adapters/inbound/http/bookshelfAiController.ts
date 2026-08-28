import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BookshelfAiUseCases } from '../../../ports/inbound/BookshelfAiUseCases';

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export class BookshelfAiController {
  constructor(private bookshelfAiUseCases: BookshelfAiUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const headers = event.headers || {};
    const userId = headers['x-user-id'] || headers['X-User-Id'] || 'dev-user-12345';

    if (method === 'OPTIONS') {
      return jsonResponse(200, { success: true });
    }

    try {
      if (path.includes('/bookshelf/upload-url') || path.includes('/bookshelf/presigned-url')) {
        if (method !== 'GET' && method !== 'POST') {
          return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
        }
        const queryParams = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};

        const fileExt = queryParams.extension || body.extension || 'jpg';
        const contentType = queryParams.contentType || body.contentType || 'image/jpeg';

        const signedData = await this.bookshelfAiUseCases.generateUploadSignedUrl(userId, fileExt, contentType);
        return jsonResponse(200, {
          success: true,
          ...signedData,
          s3Key: signedData.objectPath,
        });
      }

      if (path.includes('/bookshelf/analyze')) {
        if (method !== 'POST') {
          return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
        }

        const body = JSON.parse(event.body || '{}');
        const objectPath = body.objectPath || body.s3Key || body.key || body.filePath;

        if (!objectPath) {
          return jsonResponse(400, { success: false, error: 'objectPath parameter is required' });
        }

        const analysis = await this.bookshelfAiUseCases.analyzeBookshelfPhoto(objectPath);
        return jsonResponse(200, analysis);
      }

      return jsonResponse(404, { success: false, error: 'Endpoint not found' });
    } catch (error: any) {
      console.error('BookshelfAiController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
