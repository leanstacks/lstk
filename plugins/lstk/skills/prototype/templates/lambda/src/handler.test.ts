// Throwaway prototype. Not production code.
import { readFileSync } from 'node:fs';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handler } from './handler.ts';

const sample = JSON.parse(
  readFileSync(new URL('../events/sample.json', import.meta.url), 'utf8'),
) as APIGatewayProxyEventV2;

describe('handler', () => {
  it('returns a known order', async () => {
    expect(await handler(sample)).toMatchObject({ statusCode: 200 });
  });

  it('returns 404 for an unknown order', async () => {
    const event = { ...sample, pathParameters: { id: 'ORD-0000' } };
    expect(await handler(event)).toMatchObject({ statusCode: 404 });
  });

  it('returns 400 without an id', async () => {
    const event = { ...sample, pathParameters: undefined };
    expect(await handler(event)).toMatchObject({ statusCode: 400 });
  });
});
