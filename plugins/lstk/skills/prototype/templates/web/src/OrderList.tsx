// Throwaway prototype. Not production code.
import { useEffect, useState } from 'react';
import { listOrders } from './api/client.ts';
import type { Order } from './api/types.ts';

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    void listOrders().then(setOrders);
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.customer}</td>
            <td>{order.status}</td>
            <td>{order.total.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
