# {{name}}

## Status

Throwaway prototype. Not production code. Scaffolded {{date}} from the `lambda` template (TypeScript, Vitest).

## Purpose

TODO: the question this prototype answers, or the demo it serves.

## How to run

From `prototypes/{{name}}/`:

```bash
npm install
npm run invoke   # run the handler locally against events/sample.json
npm test         # Vitest
npm run typecheck
```

## What is faked

- Data: `src/handler.ts` answers from an in-memory map of made-up Example Orders.
- Event: `events/sample.json` is a hand-written API Gateway HTTP API (v2) event, not a captured one.
- Runtime: the handler runs in a local Node process, not in the Lambda runtime.

## Known shortcuts

- One handler, one route, no input validation beyond a missing id.
- No bundler. Nothing here is packaged for Lambda.

## Not covered

- Not deployed. A deploy would need infrastructure as code (a CDK stack), a bundling step, an execution role with
  least-privilege permissions, and credentials, none of which this prototype includes.
- Authentication and authorization
- Real data store and persistence
- Error handling, logging, and observability
- Test coverage beyond three handler cases

## Promotion

If the idea survives, run `/lstk:promote-prototype` to get a gap list with relative effort.
