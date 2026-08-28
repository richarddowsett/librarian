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

export class OpenLibraryController {
  constructor(private externalCatalogUseCases: ExternalCatalogUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const queryParams = event.queryStringParameters || {};

    try {
      if (method !== 'GET') {
        return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
      }

      const workId = queryParams.workId || queryParams.id || '';
      if (!workId) {
        return jsonResponse(400, { success: false, error: 'Work ID is required' });
      }

      const lists = await this.externalCatalogUseCases.fetchWorkLists(workId);
      return jsonResponse(200, { success: true, lists });
    } catch (error: any) {
      console.error('OpenLibraryController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
