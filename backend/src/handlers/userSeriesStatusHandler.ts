import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { container } from '../config/container';
import { UserSeriesStatusController } from '../adapters/inbound/http/userSeriesStatusController';

const controller = new UserSeriesStatusController(container.userStatusUseCases);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return controller.handleRequest(event);
}
