# Overview Document Template

Structure for `docs/PROJECT_OVERVIEW.md`. Section order is deliberate: purpose and shape first, hands-on detail after, unknowns last.

Include **required** sections always. Include **optional** sections only when the repo has real content for them; an empty or speculative section is worse than none. Replace every `<...>` placeholder; delete guidance comments.

Quality reference: a strong overview opens with a one-paragraph purpose, a stack table, an annotated folder map, an end-to-end data flow, the canonical shared types, an error surface, and a recommended build order. Those domain-specific sections (canonical types, error handling, cost, build order) belong under "Domain-specific sections" below when the repo has an obvious central contract or operational concern.

---

## Template

```markdown
# <Project Name>: Project Overview

> **Last verified:** <YYYY-MM-DD> · commit `<short-sha>`
> Maintainers: update this file when you change structure, entry points, or setup steps.

## Purpose

<!-- Required. 1–3 sentences: what it does, for whom, and what it deliberately does not do.
     Source from README/code; mark inferred text with "(inferred)". -->

## Tech stack

<!-- Required. Table: Layer | Technology | Notes. Cover language(s), frameworks, runtime/hosting,
     data stores, external services, build/test tooling. No exact versions unless they gate setup. -->

| Layer | Technology | Notes |
| :---- | :--------- | :---- |
|       |            |       |

## Repository structure

<!-- Required. Annotated tree (depth ≤ 2) per references/architecture-map.md.
     Add the package table for monorepos. -->

## Architecture and data flow

<!-- Required. One component diagram and one primary-flow diagram (Mermaid) from architecture-map.md.
     State layering/dependency rules you verified. -->

## Getting started

<!-- Required. Ordered, copy-pasteable steps derived from manifests, scripts, .env.example, containers.
     Include: prerequisites (runtime versions, tools, accounts/credentials needed), install, env setup
     (variable NAMES and what they are for, never values), run, verify-it-works step.
     Add: "_Derived from <files>; not executed during generation._" unless you ran it. -->

## Development workflow

<!-- Required. Table: Task | Command | Source (Makefile/package.json/CI). Build, test (unit/integration/e2e),
     lint/format, type-check. Note what CI runs and any pre-commit hooks. -->

## Configuration and environments

<!-- Optional. Env vars (names, purpose, required/optional, where read), config files, feature flags,
     per-environment differences. -->

## Deployment and infrastructure

<!-- Optional. IaC tool and location, environments, how a deploy happens (CI job or manual), rollbacks,
     notable cloud resources. -->

## Domain-specific sections

<!-- Optional, repo-dependent. Examples: Central contracts (canonical types/schema, with file link),
     Error handling surface (code | condition | status), Data model, Security/authN model,
     Cost profile, Performance constraints, Recommended build order. -->

## Conventions and gotchas

<!-- Required if any observed. Naming, layering rules, error handling pattern, generated code,
     things that fail non-obviously, order-dependent setup. Each item cites evidence. -->

## Where to go next

<!-- Required. Links: README, CONTRIBUTING, CLAUDE.md/AGENTS.md, ADRs, API docs, runbooks, dashboards.
     Only link what exists. -->

## Open questions

<!-- Required (may be "None identified"). Things that could not be determined from the repo, with
     what would resolve them (e.g. "Which environments exist? Not defined in IaC; ask platform team"). -->
```

---

## Writing guidance

**Tone.** Direct, peer-to-peer, scannable. Tables and short lists over paragraphs. No marketing language, no "simply" or "just".

**Specificity.** Prefer `npm run test -w packages/api` over "run the tests". Prefer `packages/api/src/handlers/extract.ts` over "the handler".

**Evidence discipline.** If a section would be mostly guesses, shrink it and move the unknowns to Open Questions.

**Length.** Typically 150–300 lines. For large monorepos, keep the top-level doc to the system view and link to per-package READMEs rather than inlining them.

**Durability checklist.**

- No exact dependency versions, test counts, or line counts
- No file inventories beyond ~10 entries
- Commands reference the source that defines them, so a reader can re-verify
- The `Last verified` stamp reflects the commit actually checked

**Update mode.** When editing an existing doc, keep its section names and voice where they still make sense. Map the template onto the existing structure rather than replacing it.
