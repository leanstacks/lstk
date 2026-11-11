# AGENTS.md Template and Examples

Read at the start of Phase 3. **Omit any section with nothing non-obvious to say.** Budget: root ≤150 lines, nested ≤80.

## Contents

- Root file skeleton
- Nested file skeleton
- Worked example (single-component service)
- Worked example (nested file in a monorepo)
- Quality checklist

---

## Root file skeleton

````markdown
# <Project name>

<One or two lines: what this project is and who uses it.>

## Stack

<Languages, frameworks, package manager, runtime/infra target. One short paragraph or list. Versions only if not pinned in a manifest.>

## Commands

Run from the repo root unless noted.

```bash
<install>
<dev/run>
<build>
<test all>
<test single file/package>
<lint>
<format>
<typecheck>
<codegen / migrate, if any>
```

## Layout

<Architecture map per references/architecture-map.md>

## Conventions

- <Only rules that deviate from defaults or are not enforced by tooling>
- <Testing: where tests live, naming, what to mock>
- <Error handling / logging / config idioms specific to this repo>

## Boundaries

**Always:** <safe actions, e.g. run the linter and tests before finishing>
**Ask first:** <e.g. adding dependencies, changing public API, altering CI, schema changes>
**Never:** <e.g. edit generated files, commit secrets, force-push, modify applied migrations>

## Definition of done

<Exact checks that must pass: lint, typecheck, tests, build.>

## Further reading

- <Relative links to README, CONTRIBUTING, ADRs, nested AGENTS.md files>
````

---

## Nested file skeleton

````markdown
# <Component name>

<One line: role of this component.> Rules here add to the root `AGENTS.md`.

## Commands

Run from `<path>`.

```bash
<component-specific commands only>
```

## Conventions

- <Differences from root only>

## Boundaries

- <Component-specific hazards>
````

---

## Worked example: single-component service

````markdown
# Orders API

NestJS REST service handling order intake for the storefront. Deployed to AWS Lambda via CDK.

## Stack

TypeScript, NestJS, Prisma (PostgreSQL), Jest. Package manager: pnpm. Node version in `.nvmrc`.

## Commands

```bash
pnpm install
pnpm start:dev                  # local server on :3000, needs .env (copy .env.example)
pnpm test                       # unit tests
pnpm test src/orders/orders.service.spec.ts   # single file
pnpm test:e2e                   # requires docker compose up -d db
pnpm lint && pnpm typecheck
pnpm prisma:generate            # run after any schema.prisma change
```

## Layout

```text
src/
├── main.ts          # Bootstrap
├── <module>/        # One folder per domain module: controller, service, dto, spec
├── common/          # Cross-cutting: filters, guards, interceptors
prisma/
├── schema.prisma
└── migrations/      # Applied migrations are immutable
infra/               # CDK app (see infra/AGENTS.md)
```

## Conventions

- Controllers contain no business logic; delegate to services.
- DTOs validated with class-validator; never trust raw request bodies.
- Tests live beside source as `*.spec.ts`; mock Prisma via `test/prisma-mock.ts`.

## Boundaries

**Always:** run `pnpm lint && pnpm typecheck && pnpm test` before finishing.
**Ask first:** adding dependencies, changing a response shape, editing `infra/`.
**Never:** edit files in `src/generated/`, modify an applied migration, commit `.env`.

## Definition of done

Lint, typecheck, and unit tests pass; `pnpm prisma:generate` leaves no diff.
````

---

## Worked example: nested file in a monorepo

````markdown
# infra (AWS CDK)

CDK app defining all AWS resources. Rules here add to the root `AGENTS.md`.

## Commands

Run from `infra/`.

```bash
pnpm cdk synth                  # always run before proposing changes
pnpm cdk diff <StackName>
pnpm test                       # snapshot and assertion tests
```

## Conventions

- One stack per bounded context in `lib/stacks/`; shared constructs in `lib/constructs/`.
- Resource names derive from `lib/config.ts`; no hard-coded account IDs or regions.

## Boundaries

**Never:** run `cdk deploy` or `cdk destroy`; update snapshots without reviewing the diff.
````

---

## Quality checklist

- [ ] Every command was verified against a manifest, Makefile, or CI file
- [ ] Every path exists
- [ ] No content duplicates the README or tooling-enforced rules
- [ ] Rules are imperative and testable
- [ ] Boundaries come from real hazards found during reconnaissance
- [ ] Nested files contain no root content
- [ ] No secrets, no volatile counts or listings
- [ ] Unverified items are reported to the user, not guessed
