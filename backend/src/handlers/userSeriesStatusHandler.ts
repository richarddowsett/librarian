import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getUserSeriesStatusDb,
  saveUserSeriesStatusDb,
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
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const userId = getUserId(event);

  if (!userId) {
    return jsonResponse(401, { success: false, error: 'Unauthorized: missing user claim' });
  }

  const pathParameters = event.pathParameters || {};
  const seriesId = pathParameters.seriesId;

  try {
    if (method === 'OPTIONS') {
      return jsonResponse(200, { success: true });
    }

    // GET /user-series-status/{seriesId}
    if (method === 'GET' && seriesId) {
      const status = await getUserSeriesStatusDb(userId, seriesId);
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

    // POST or PUT /user-series-status
    if (method === 'POST' || method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const targetSeriesId = seriesId || body.seriesId;

      if (!targetSeriesId) {
        return jsonResponse(400, { success: false, error: 'seriesId is required' });
      }

      const isCompleted = body.isCompleted === true;
      const ignoredVolumes = Array.isArray(body.ignoredVolumes) ? body.ignoredVolumes : [];

      const status = await saveUserSeriesStatusDb(userId, targetSeriesId, isCompleted, ignoredVolumes);
      return jsonResponse(200, { success: true, status });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('UserSeriesStatusHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
