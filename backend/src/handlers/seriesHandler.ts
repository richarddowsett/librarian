import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { fetchSeriesDetails } from '../services/series';
import { SeriesDetails } from '../types';

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const pathParameters = event.pathParameters || {};
  const seriesId = pathParameters.id;

  try {
    if (method === 'OPTIONS') {
      return jsonResponse(200, { success: true });
    }

    // GET /series/{id} - Get single series details
    if (method === 'GET' && seriesId) {
      const series = await fetchSeriesDetails(seriesId);
      if (!series) {
        return jsonResponse(404, { success: false, error: 'Series not found' });
      }
      return jsonResponse(200, { success: true, series });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('SeriesHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
