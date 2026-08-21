import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getSeriesById, getAllSeries, putSeries } from '../services/dynamoService';
import { fetchSeriesDetails, addOpenLibrarySeriesList, ensureSeriesUpToDate } from '../services/series';
import { SeriesDetails } from '../types';

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

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const pathParameters = event.pathParameters || {};
  const seriesId = pathParameters.id;
  const userId = event.headers['x-user-id'] || event.headers['X-User-Id'] || '';

  try {
    // GET /series - List all cached series
    if (method === 'GET' && !seriesId) {
      const rawSeriesList = await getAllSeries();
      const seriesList: SeriesDetails[] = [];
      for (const item of rawSeriesList) {
        const updated = await ensureSeriesUpToDate(item);
        seriesList.push(updated);
      }
      return jsonResponse(200, { success: true, series: seriesList });
    }

    // GET /series/{id} - Get single series details
    if (method === 'GET' && seriesId) {
      let series = await getSeriesById(seriesId);
      if (!series && seriesId.startsWith('OL')) {
        // Try fetching series metadata from Open Library if missing
        series = await fetchSeriesDetails(seriesId);
        if (series) {
          await putSeries(series);
        }
      }

      if (!series) {
        return jsonResponse(404, { success: false, error: 'Series not found' });
      }

      series = await ensureSeriesUpToDate(series);
      return jsonResponse(200, { success: true, series });
    }

    // POST /series - Add, import list, or update a series
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Open Library List Import
      if (body.listUrl) {
        const importedSeries = await addOpenLibrarySeriesList(
          userId,
          body.listUrl,
          body.listName || body.name,
          body.workId || body.openLibraryWorkId
        );
        return jsonResponse(201, { success: true, series: importedSeries });
      }

      const newSeries: SeriesDetails = {
        ...body,
        id: body.id || `series_${Date.now()}`,
      };
      await putSeries(newSeries);
      return jsonResponse(201, { success: true, series: newSeries });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('SeriesHandler Error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
  }
}
