# Example: `prototype`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [cdk-iam-review](cdk-iam-review.md).
Next: [promote-prototype](promote-prototype.md).

## Prompt

```text
/lstk:prototype An order-status dashboard for Example Orders support staff, so we can show the team what the screen
could look like. Web shape, name it order-status.
```

## What happens

1. **Ground.** Read `AGENTS.md`, the workspace and lint config, and any existing `prototypes/`. Use `stack-profile`
   defaults only where the repo is silent.
2. **Check placement.** Report what will pick up `prototypes/order-status/` (here: the root `workspaces` glob does not
   match it, but root Prettier and oxlint do). Root config is never edited.
3. **Scaffold** with `scaffold.mjs`, which copies the `web` template and substitutes the name and date.
4. **Tailor** the generated code to the idea, mocking at the API boundary, and keep the throwaway header on every new
   source file.
5. **Write `PROTOTYPE.md`** honestly, then tell the user how to run it. The skill does not run `npm install`.

The skill writes only under `prototypes/order-status/`. It never copies real data, edits root config, or runs a deploy
command. This is a throwaway prototype, not a start on production code.

## Result

File tree:

```text
prototypes/order-status/
├── .gitignore
├── PROTOTYPE.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── OrderList.test.tsx
    ├── OrderList.tsx
    ├── StatusFilter.tsx
    ├── main.tsx
    └── api/
        ├── client.ts
        ├── fixtures.ts
        └── types.ts
```

`PROTOTYPE.md`:

````markdown
# order-status

## Status

Throwaway prototype. Not production code. Scaffolded 2026-11-13 from the `web` template (Vite, React, TypeScript).

## Purpose

Show support staff a status-filtered view of Example Orders orders, to settle whether a filter-first layout is worth
building.

## How to run

From `prototypes/order-status/`:

```bash
npm install
npm run dev     # local dev server
npm test        # Vitest
npm run build   # type check and production build
```

## What is faked

- Orders API: `src/api/client.ts` answers from in-process fixtures in `src/api/fixtures.ts`. No network call is made.
- Data: every order is made-up Example Orders data.
- Status changes: the filter only hides rows. Nothing is written anywhere.

## Known shortcuts

- Single page, no routing.
- No loading or error state in `OrderList`.
- Filter state lives in component state and is lost on reload.

## Not covered

- Authentication and authorization
- Real API and persistence
- Error handling and observability
- Accessibility review, responsive layout, and styling
- Infrastructure as code and deployment (not deployed)
- Test coverage beyond one smoke test

## Promotion

If the idea survives, run `/lstk:promote-prototype` to get a gap list with relative effort.
````

Next step for the user: run the commands under `How to run`, show the team, and then either discard the directory or run
`/lstk:promote-prototype prototypes/order-status`.
