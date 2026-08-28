import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SeriesUseCases } from '../../../ports/inbound/SeriesUseCases';

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

export class SeriesController {
  constructor(private seriesUseCases: SeriesUseCases) {}

  async handleRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method.toUpperCase();
    const pathParameters = event.pathParameters || {};
    const seriesId = pathParameters.id;
    const headers = event.headers || {};
    const userId = headers['x-user-id'] || headers['X-User-Id'] || '';

    try {
      if (method === 'GET' && !seriesId) {
        const seriesList = await this.seriesUseCases.getAllSeries();
        return jsonResponse(200, { success: true, series: seriesList });
      }

      if (method === 'GET' && seriesId) {
        const series = await this.seriesUseCases.getSeriesById(seriesId);
        if (!series) {
          return jsonResponse(404, { success: false, error: 'Series not found' });
        }
        return jsonResponse(200, { success: true, series });
      }

      if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        if (body.listUrl) {
          const importedSeries = await this.seriesUseCases.importOpenLibrarySeriesList(
            userId,
            body.listUrl,
            body.listName || body.name,
            body.workId || body.openLibraryWorkId
          );
          return jsonResponse(201, { success: true, series: importedSeries });
        }

        const savedSeries = await this.seriesUseCases.saveSeries(body);
        return jsonResponse(201, { success: true, series: savedSeries });
      }

      return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
    } catch (error: any) {
      console.error('SeriesController Error:', error);
      return jsonResponse(500, { success: false, error: error.message || 'Internal Server Error' });
    }
  }
}
