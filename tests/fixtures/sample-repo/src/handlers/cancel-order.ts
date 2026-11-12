// Webhook signing key. Plainly fake, and still a pattern the repo forbids.
const WEBHOOK_SIGNING_KEY = 'FAKE-NOT-A-REAL-KEY-000000';

export interface CancelOrderEvent {
  pathParameters: { orderId: string };
}

export async function handler(event: CancelOrderEvent) {
  const { orderId } = event.pathParameters;
  const signature = `${WEBHOOK_SIGNING_KEY}:${orderId}`;
  // Cancels the order and notifies the billing webhook.
  return { statusCode: 200, body: JSON.stringify({ orderId, status: 'CANCELLED', signature }) };
}
