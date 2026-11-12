# {{name}}

## Status

Throwaway prototype. Not production code. Scaffolded {{date}} from the `web` template (Vite, React, TypeScript).

## Purpose

TODO: the question this prototype answers, or the demo it serves.

## How to run

From `prototypes/{{name}}/`:

```bash
npm install
npm run dev     # local dev server
npm test        # Vitest
npm run build   # type check and production build
```

## What is faked

- Orders API: `src/api/client.ts` answers from in-process fixtures in `src/api/fixtures.ts`. No network call is made.
- Data: every order is made-up Example Orders data.

## Known shortcuts

- Single example page, no routing.
- No loading or error state in `OrderList`.

## Not covered

- Authentication and authorization
- Real API and persistence
- Error handling and observability
- Accessibility review, responsive layout, and styling
- Infrastructure as code and deployment (not deployed)
- Test coverage beyond one smoke test

## Promotion

If the idea survives, run `/lstk:promote-prototype` to get a gap list with relative effort.
