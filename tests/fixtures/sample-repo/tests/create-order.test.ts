import { describe, expect, it } from 'vitest';
import { handler } from '../src/handlers/create-order';

describe('create-order', () => {
  it('rejects an empty item list', async () => {
    const res = await handler({ body: JSON.stringify({ items: [] }) });
    expect(res.statusCode).toBe(400);
  });
});
