# AGENTS.md

Example Orders is a serverless order service on AWS.

## Stack

- TypeScript ESM, AWS CDK v2 in `infra/`, Lambda handlers in `src/handlers/`.
- Vitest for tests, in `tests/`. oxlint and Prettier own style.

## Conventions

- Every handler has a test in `tests/<handler>.test.ts`.
- API routes require the Cognito authorizer unless the route is explicitly public and listed in the README.
- Lambda roles are per function and use `grant*` methods on constructs.
- No secrets in source. Read them from Secrets Manager at runtime.
