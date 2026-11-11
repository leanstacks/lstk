---
name: stack-profile
description: Holds the default technology stack (TypeScript ESM, NestJS on containers, Lambda serverless, Vite + React, AWS CDK in TypeScript, Vitest, oxlint, Prettier, npm workspaces) for use when a repo does not state its own. Load when a task needs stack defaults, such as designing a system, scaffolding, or evaluating technology. The repo's own AGENTS.md and config always win.
user-invocable: false
---

# Stack Profile

Reference only. This skill supplies default technology choices so other work stays consistent. It is not a workflow.

## Precedence rule

1. The repo's `AGENTS.md`, `CLAUDE.md`, and tool config (`package.json`, `tsconfig`, `cdk.json`, lint and format config) **win**. Read them first.
2. This profile fills gaps only. Never override, or "correct", a stack the repo already chose.
3. The profile does **not apply** when the project has no TypeScript, targets a non-AWS platform, or the user names a different stack. Say so and work from the repo or the user's stated stack.
4. A deviation from a default is fine when it is deliberate. Note it, and use the rationale below to judge it.

## Detection

Confirm the repo matches before applying defaults.

| Signal                                     | Indicates                   |
| ------------------------------------------ | --------------------------- |
| `package-lock.json`, `workspaces` field    | npm and npm workspaces      |
| `tsconfig.json`, `"type": "module"`        | TypeScript ESM              |
| `nest-cli.json`, `@nestjs/*` dependencies  | NestJS                      |
| `vite.config.*`, `react` dependency        | Vite + React                |
| `cdk.json`, `aws-cdk-lib` dependency       | AWS CDK in TypeScript       |
| `vitest.config.*`                          | Vitest                      |
| `.oxlintrc.json`, `.prettierrc*`           | oxlint and Prettier         |
| `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb` | A different package manager |

An empty repo has no signals, so the defaults apply in full.

## Defaults

| Area                 | Default                                    |
| -------------------- | ------------------------------------------ |
| Language and modules | TypeScript, ESM                            |
| Package management   | npm, with npm workspaces for multi-package |
| Backend, containers  | NestJS on containers                       |
| Backend, serverless  | AWS Lambda (Node.js) behind API Gateway    |
| Frontend             | Vite + React                               |
| Infrastructure       | AWS CDK in TypeScript                      |
| Testing              | Vitest                                     |
| Linting              | oxlint                                     |
| Formatting           | Prettier                                   |

Per-area detail, such as when to choose containers over Lambda, is in [references/defaults.md](references/defaults.md). Load it only when the choice matters.

## Rationale

- **TypeScript ESM:** one language across frontend, backend, and infrastructure, and ESM is the platform direction.
- **npm workspaces:** built in, with no extra tool to install or explain.
- **NestJS on containers:** structure and dependency injection for long-lived, multi-route services with steady load.
- **Lambda serverless:** fits spiky, event-driven, or low-traffic workloads where idle cost matters.
- **Vite + React:** fast dev loop and a large ecosystem.
- **CDK in TypeScript:** infrastructure in the same language and toolchain as the application.
- **Vitest:** native ESM and TypeScript, with a Jest-compatible API.
- **oxlint:** fast linting with no heavy config. Style rules belong to the linter and formatter, not to prose.
- **Prettier:** one formatter, no style debates.

## Where the profile is used

The skills `tech-eval`, `adr-author`, and `solution-outline` apply these defaults where the repo is silent. They refer to this skill by name only.
