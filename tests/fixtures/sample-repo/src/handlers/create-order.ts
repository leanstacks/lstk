import { randomUUID } from 'node:crypto';

export interface CreateOrderEvent {
  body: string;
}

export async function handler(event: CreateOrderEvent) {
  const input = JSON.parse(event.body) as { items: string[] };
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { statusCode: 400, body: 'items required' };
  }
  const orderId = randomUUID();
  return { statusCode: 201, body: JSON.stringify({ orderId, items: input.items }) };
}
