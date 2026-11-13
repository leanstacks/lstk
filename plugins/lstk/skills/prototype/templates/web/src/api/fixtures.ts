// Throwaway prototype. Not production code.
// Plainly fake data for Example Orders. Never copy real customer data here.
import type { Order } from './types.ts';

export const orders: Order[] = [
  { id: 'ORD-1001', customer: 'Example Customer A', status: 'PLACED', total: 42.5, placedAt: '2026-01-05T09:00:00Z' },
  { id: 'ORD-1002', customer: 'Example Customer B', status: 'PACKED', total: 18, placedAt: '2026-01-05T10:30:00Z' },
  { id: 'ORD-1003', customer: 'Example Customer C', status: 'SHIPPED', total: 99.99, placedAt: '2026-01-06T08:15:00Z' },
  {
    id: 'ORD-1004',
    customer: 'Example Customer D',
    status: 'DELIVERED',
    total: 7.25,
    placedAt: '2026-01-04T16:45:00Z',
  },
];
