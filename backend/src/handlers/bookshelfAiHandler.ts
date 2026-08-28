import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { BookshelfAiController } from '../adapters/inbound/http/bookshelfAiController';

const controller = new BookshelfAiController(container.bookshelfAiUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return controller.handleRequest(event);
}
