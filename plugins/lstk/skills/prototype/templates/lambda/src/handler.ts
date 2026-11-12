// Throwaway prototype. Not production code.
// One Lambda handler for an API Gateway HTTP API (payload v2): GET /orders/{id}.
// It answers from an in-memory map. Nothing is deployed, and no AWS service is called.
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Plainly fake Example Orders data.
const ORDERS: Record<string, { id: string; status: string }> = {
  'ORD-1001': { id: 'ORD-1001', status: 'PLACED' },
  'ORD-1002': { id: 'ORD-1002', status: 'SHIPPED' },
};

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const id = event.pathParameters?.id;
  if (!id) {
    return json(400, { message: 'id is required' });
  }
  const order = ORDERS[id];
  return order ? json(200, order) : json(404, { message: 'order not found' });
}
