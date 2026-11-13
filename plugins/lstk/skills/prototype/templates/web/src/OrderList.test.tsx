// Throwaway prototype. Not production code.
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { OrderList } from './OrderList.tsx';

it('lists the fixture orders', async () => {
  render(<OrderList />);
  expect(await screen.findByText('ORD-1001')).toBeTruthy();
  expect(screen.getAllByRole('row')).toHaveLength(5);
});
