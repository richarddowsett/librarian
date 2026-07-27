import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getUserSeriesStatus,
  getAllUserSeriesStatuses,
  putUserSeriesStatus,
} from '../services/dynamoService';
import { UserSeriesStatus } from '../types';

function getUserId(event: APIGatewayProxyEventV2): string {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (claims && typeof claims.sub === 'string') {
    return claims.sub;
  }
  return (event.headers && event.headers['x-user-id']) || 'dev-user-12345';
}

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const userId = getUserId(event);
  const pathParameters = event.pathParameters || {};
  const seriesId = pathParameters.seriesId;

  try {
    // GET /user-series-status - List all series status for current user
    if (method === 'GET' && !seriesId) {
      const statuses = await getAllUserSeriesStatuses(userId);
      return jsonResponse(200, { success: true, statuses });
    }

    // GET /user-series-status/{seriesId} - Get series status for specific series
    if (method === 'GET' && seriesId) {
      const status = await getUserSeriesStatus(userId, seriesId);
      return jsonResponse(200, {
        success: true,
        status: status || {
          id: `${userId}_${seriesId}`,
          userId,
          seriesId,
          isCompleted: false,
          ignoredVolumes: [],
        },
      });
    }

    // POST or PUT /user-series-status - Update or create status
    if (method === 'POST' || method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const targetSeriesId = seriesId || body.seriesId;

      if (!targetSeriesId) {
        return jsonResponse(400, { success: false, error: 'seriesId is required' });
      }

      const existing = (await getUserSeriesStatus(userId, targetSeriesId)) || {
        id: `${userId}_${targetSeriesId}`,
        userId,
        seriesId: targetSeriesId,
        isCompleted: false,
        ignoredVolumes: [],
      };

      const updatedStatus: UserSeriesStatus = {
        ...existing,
        ...body,
        userId,
        seriesId: targetSeriesId,
      };

      await putUserSeriesStatus(updatedStatus);
      return jsonResponse(200, { success: true, status: updatedStatus });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('UserSeriesStatusHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
