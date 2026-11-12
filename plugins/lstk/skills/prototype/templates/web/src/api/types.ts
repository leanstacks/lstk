// Throwaway prototype. Not production code.

export type OrderStatus = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED';

export interface Order {
  id: string;
  customer: string;
  status: OrderStatus;
  total: number;
  placedAt: string;
}
