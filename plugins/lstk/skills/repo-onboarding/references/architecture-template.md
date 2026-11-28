# Architecture Document Template

Structure for `docs/ARCHITECTURE.md`. Section order is deliberate: what the system is and how it is shaped first, then the invariants and contracts an agent cannot learn from the code, then supporting detail, unknowns last. The document is read by humans and coding agents, so the non-discoverable content sits near the top.

This document owns structure, not procedure. Setup lives in `docs/LOCAL_SETUP.md` and commands and agent rules live in `AGENTS.md`; link to them and do not copy them.

Include **required** sections always. Include **optional** sections only when the repo has real content for them; an empty or speculative section is worse than none. Replace every `<...>` placeholder; delete guidance comments.

Quality reference: a strong architecture doc opens with a one-paragraph purpose, an annotated folder map, an end-to-end data flow, the dependency direction, the canonical shared types, and the invariants that break things when violated. Domain-specific material (error surface, cost, build order) belongs under "Domain-specific sections" when the repo has an obvious central contract or operational concern.

---

## Template

```markdown
# <Project Name>: Architecture

> For humans and coding agents.
> **Last verified:** <YYYY-MM-DD> · commit `<short-sha>`
> Maintainers: update this file when you change structure, entry points, or contracts.

## Purpose

<!-- Required. 1–3 sentences: what it does, for whom, and what it deliberately does not do.
     Source from README/code; mark inferred text with "(inferred)". -->

## Architecture and data flow

<!-- Required. One component diagram and one primary-flow diagram (Mermaid) from architecture-map.md.
     State the dependency direction (which layer imports which) and any layering rule you verified. -->

## Repository structure

<!-- Required. Annotated tree (depth ≤ 2) per references/architecture-map.md.
     Add the package table for monorepos. -->

## Central contracts and invariants

<!-- Required if any observed. The shared types, schemas, API definitions, or data models the rest of the
     system depends on (link the file, do not copy it), and the invariants that break things when violated
     (ordering, ownership, "never import X from Y", generated files). Only what a reader cannot see by
     skimming the code. Each item cites evidence. -->

## Tech stack

<!-- Required. Table: Layer | Technology | Notes. Cover language(s), frameworks, runtime/hosting,
     data stores, external services, build/test tooling. No exact versions unless they gate setup. -->

| Layer | Technology | Notes |
| :---- | :--------- | :---- |
|       |            |       |

## Configuration and environments

<!-- Optional. Env vars (names, purpose, required/optional, where read), config files, feature flags,
     per-environment differences. -->

## Deployment and infrastructure

<!-- Optional. Structure, not commands: IaC tool and location, environments, notable cloud resources,
     where the deploy is defined (link the CI file). -->

## Domain-specific sections

<!-- Optional, repo-dependent. Examples: Error handling surface (code | condition | status), Data model,
     Security/authN model, Cost profile, Performance constraints, Recommended build order. -->

## Conventions

<!-- Optional. Architectural conventions only: layering, naming that encodes structure, error-handling
     pattern, generated code. Coding rules and commands belong in AGENTS.md; link there. -->

## Where to go next

<!-- Required. Links, only what exists:
     - Setup: docs/LOCAL_SETUP.md. If it is missing, either give a three-line recipe derived from
       manifests and scripts, marked "derived, not executed", or offer /lstk:local-setup-author.
     - Commands and agent rules: AGENTS.md, and the CI workflow file for what CI runs.
     - README, CONTRIBUTING, ADRs, API docs, runbooks, dashboards. -->

## Open questions

<!-- Required (may be "None identified"). Things that could not be determined from the repo, with
     what would resolve them (e.g. "Which environments exist? Not defined in IaC; ask platform team"). -->
```

---

## Writing guidance

**Tone.** Direct, peer-to-peer, scannable. Tables and short lists over paragraphs. No marketing language, no "simply" or "just".

**Specificity.** Prefer `npm run test -w packages/api` over "run the tests". Prefer `packages/api/src/handlers/extract.ts` over "the handler".

**Evidence discipline.** If a section would be mostly guesses, shrink it and move the unknowns to Open Questions.

**Length.** Typically 100–250 lines. For large monorepos, keep the top-level doc to the system view and link to per-package READMEs rather than inlining them.

**Durability checklist.**

- No exact dependency versions, test counts, or line counts
- No file inventories beyond ~10 entries
- Commands reference the source that defines them, so a reader can re-verify
- The `Last verified` stamp reflects the commit actually checked

**Update mode.** When editing an existing doc, keep its section names and voice where they still make sense. Map the template onto the existing structure rather than replacing it.
