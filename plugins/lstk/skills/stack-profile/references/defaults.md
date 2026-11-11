# Default details by area

Applies only where the repo is silent. See the precedence rule in `SKILL.md`.

## Containers or Lambda

| Choose containers (NestJS) when                     | Choose Lambda when                              |
| --------------------------------------------------- | ----------------------------------------------- |
| Traffic is steady and the service is long-lived     | Traffic is spiky, event-driven, or low          |
| Many routes share a domain model and a module graph | Functions are small and independent             |
| Latency must be consistent (no cold starts)         | Scale to zero matters for cost                  |
| WebSockets or long-running work are needed          | Work fits within Lambda time and payload limits |

When unsure, state the assumption and offer both. Use `tech-eval` for a real comparison.

## Language and tooling

- TypeScript with `strict` enabled, ESM output, `.mjs` only for plain Node scripts.
- Prefer Node built-ins in scripts and tooling to keep dependencies small.
- Pin tool versions in `package.json`. Commit the lockfile.

## Frontend

- Vite + React with TypeScript. Keep server state and client state separate.
- Tests with Vitest, plus Testing Library for components.

## Infrastructure

- CDK stacks in TypeScript, one stack per deployable unit, constructs for reusable parts.
- Keep environment-specific values in config, not in constructs.

## Quality gates

- Vitest for tests, oxlint for linting, Prettier for formatting.
- One command (for example `npm run check`) runs all gates, and CI runs the same command.
