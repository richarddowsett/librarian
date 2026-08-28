import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { OpenLibraryController } from '../adapters/inbound/http/openLibraryController';

const controller = new OpenLibraryController(container.externalCatalogUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return controller.handleRequest(event);
}
