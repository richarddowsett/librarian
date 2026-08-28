import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UserSeriesStatusUseCases } from '../../../ports/inbound/UserSeriesStatusUseCases';

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export class UserSeriesStatusController {
  constructor(private userStatusUseCases: UserSeriesStatusUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const headers = event.headers || {};
    const userId = headers['x-user-id'] || headers['X-User-Id'] || '';
    const pathParameters = event.pathParameters || {};
    const seriesId = pathParameters.seriesId || pathParameters.id;

    try {
      if (!userId) {
        return jsonResponse(400, { success: false, error: 'User ID is required' });
      }

      if (method === 'GET' && seriesId) {
        const status = await this.userStatusUseCases.getUserSeriesStatus(userId, seriesId);
        return jsonResponse(200, { success: true, status: status || { userId, seriesId, isCompleted: false, ignoredVolumes: [] } });
      }

      if ((method === 'POST' || method === 'PUT') && seriesId) {
        const body = JSON.parse(event.body || '{}');
        const status = await this.userStatusUseCases.updateUserSeriesStatus(userId, seriesId, body);
        return jsonResponse(200, { success: true, status });
      }

      return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
    } catch (error: any) {
      console.error('UserSeriesStatusController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
