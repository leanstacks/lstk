// Throwaway prototype. Not production code.
// The API boundary. By default it answers from in-process fixtures (no network).
// To try a real backend later, call setBaseUrl('https://api.example.test'); the fetch path below then runs.
import { orders } from './fixtures.ts';
import type { Order } from './types.ts';

let baseUrl: string | undefined;

export function setBaseUrl(url: string | undefined): void {
  baseUrl = url;
}

export async function listOrders(): Promise<Order[]> {
  if (baseUrl === undefined) {
    return orders;
  }
  const response = await fetch(`${baseUrl}/orders`);
  if (!response.ok) {
    throw new Error(`GET /orders failed with ${response.status}`);
  }
  return (await response.json()) as Order[];
}
