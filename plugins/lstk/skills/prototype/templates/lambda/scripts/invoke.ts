// Throwaway prototype. Not production code.
// Local invocation: npm run invoke [path-to-event.json]. Runs the handler in this process. No AWS call is made.
import { readFileSync } from 'node:fs';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from '../src/handler.ts';

const file = process.argv[2] ?? 'events/sample.json';
const event = JSON.parse(readFileSync(file, 'utf8')) as APIGatewayProxyEventV2;
console.log(JSON.stringify(await handler(event), null, 2));
