# Architecture Map: Format Conventions

Used in Phase 2 (to present findings) and Phase 3 (the "Layout" section of `AGENTS.md`).

## Goals

Help an agent decide **where to look and where to put things** in under 30 seconds. It is a map, not an inventory.

## Rules

1. **Directories, not files.** List files only for entry points and config that agents must know by name.
2. **Annotate with purpose, not description of contents.** "HTTP handlers; no business logic" is useful. "Contains source files" is not.
3. **Depth: 2 levels by default,** 3 only where structure is non-obvious.
4. **Include a placement rule** for each major directory when it is not obvious (where new code, tests, migrations go).
5. **Flag generated, vendored, or protected paths** with a marker so agents do not edit them: `(generated)`, `(vendored)`, `(do not edit)`.
6. **Omit** dependency directories, build output, and anything git-ignored.
7. **Stable only.** Skip directories likely to churn. Do not count files.
8. **Monorepos:** show components at the top level of the map, each with stack, role, and dependency direction. Put detail in nested `AGENTS.md` files.

## Format

Use a fenced tree with aligned `#` comments.

```text
.
├── apps/
│   ├── api/            # NestJS REST API. Entry: src/main.ts
│   └── web/            # React SPA (Vite). Entry: src/main.tsx
├── packages/
│   ├── shared-types/   # Types shared by api and web. Build this first
│   └── ui/             # Component library consumed by web
├── infra/              # AWS CDK (TypeScript). See infra/AGENTS.md
├── scripts/            # Dev and CI helper scripts
└── docs/adr/           # Architecture decision records (read before structural changes)
```

For monorepos, add a dependency line:

```text
Dependency direction: apps/* -> packages/*. packages/* must never import from apps/*.
```

## Placement rules (optional, include when non-obvious)

```text
- New API endpoint: apps/api/src/<module>/ (controller + service + dto), tests beside source as *.spec.ts
- Shared type used by both api and web: packages/shared-types, never duplicate
- DB migration: apps/api/migrations/, generate with `pnpm db:migration:create`
```

## Anti-patterns

- Full recursive `tree` output pasted in.
- Listing every file in `src/`.
- Descriptions that restate the folder name ("utils: utilities").
- Stating counts, versions, or sizes that will rot.
