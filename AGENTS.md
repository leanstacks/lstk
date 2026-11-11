# AGENTS.md

lstk is a Claude Code plugin marketplace. The repo is the marketplace (`lstk`) and holds two plugins. The plan is in
`docs/PLAN.md`, and the verified plugin contract is in `docs/ARCHITECTURE.md`.

## Layout

- `.claude-plugin/marketplace.json`: marketplace manifest listing both plugins.
- `plugins/lstk/`: lifecycle skills (`skills/<name>/SKILL.md`, with `references/`) and agents. `agents-md-author` ships
  `scripts/recon.mjs`, a read-only repo survey.
- `plugins/lstk-guardrails/`: `hooks/` (two `.mjs` hooks, `hooks.json`, shared `hooks/lib/`), `scripts/merge-settings.mjs`,
  `skills/init/`, and `snippets/` (`baseline.json`, `convenience.json`).
- `scripts/lint-plugins.mjs`: manifest and frontmatter linter.
- `tests/`: Vitest tests. `tests/fixtures/hook-matrix.json` is the allow, ask, and deny matrix for the hooks.
  `tests/evals/<skill>.json` holds each skill's trigger evals.
- `docs/`: plan, architecture, and contributing guides.

## Commands

```bash
npm ci                 # install
npm test               # Vitest
npm run lint           # oxlint
npm run format:check   # Prettier (use `npm run format` to fix)
npm run lint:plugins   # validate manifests and skill/agent frontmatter
npm run check          # all of the above, in sequence
npm run validate       # claude plugin validate --strict (needs the claude CLI)
```

## Conventions

- ESM only (`.mjs`). Scripts and hooks use Node built-ins only, with no runtime dependencies.
- Each plugin is self-contained. Plugins are copied to a cache on install, so **never reference files outside a plugin
  directory (no `../`)**. Nothing is shared across plugins.
- Only `plugin.json` goes in a plugin's `.claude-plugin/`. `skills/`, `agents/`, and `hooks/` sit at the plugin root.
- A skill's `name` must equal its directory name. Its `description` states what it does and when to use it.
- Hooks fail open: an unexpected internal error warns on stderr and allows the call. A matched rule denies or asks
  through the JSON `permissionDecision` output, never exit 2.
- Protected-file patterns come from built-in defaults plus `.claude/lstk.json` (`protectedPatterns`,
  `unprotectPatterns`) and the uncommitted `.claude/lstk.local.json`.
- Plugins ship no shell scripts and no test fixtures. Hook tests must not need `bash` or `jq`.
- Skills with side effects set `disable-model-invocation: true`.
- Every skill needs a trigger eval file in `tests/evals/`. `tests/evals.test.mjs` fails without one.
- Bump a plugin's `version` in its `plugin.json` for every released change, or installed users will not receive it.
- Docs are Markdown with Mermaid diagrams. Style is owned by Prettier and oxlint, not by prose.
- Commit messages use the prefixes `feat`, `fix`, `chore`, and `doc`.
- This is a public repo. Never commit client names, personal paths, or credentials.
