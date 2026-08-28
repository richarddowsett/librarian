import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { SeriesController } from '../adapters/inbound/http/seriesController';

const seriesController = new SeriesController(container.seriesUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return seriesController.handleRequest(event);
}
