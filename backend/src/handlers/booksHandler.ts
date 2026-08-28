import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { BooksController } from '../adapters/inbound/http/booksController';

const booksController = new BooksController(container.bookUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return booksController.handleRequest(event);
}
