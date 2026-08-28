import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { GoogleBooksController } from '../adapters/inbound/http/googleBooksController';

const controller = new GoogleBooksController(container.externalCatalogUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return controller.handleRequest(event);
}
