# AGENTS.md

lstk is a Claude Code plugin marketplace. The repo is the marketplace (`lstk`) and holds two plugins. The plan is in
`docs/PLAN.md`, and the verified plugin contract is in `docs/ARCHITECTURE.md`.

## Layout

- `.claude-plugin/marketplace.json`: marketplace manifest listing both plugins.
- `plugins/lstk/`: lifecycle skills and agents.
- `plugins/lstk-guardrails/`: hooks, the `init` skill, and settings snippets.
- `scripts/lint-plugins.mjs`: manifest and frontmatter linter.
- `tests/`: Vitest tests.
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
- Skills with side effects set `disable-model-invocation: true`.
- Bump a plugin's `version` in its `plugin.json` for every released change, or installed users will not receive it.
- Docs are Markdown with Mermaid diagrams. Style is owned by Prettier and oxlint, not by prose.
- Commit messages use the prefixes `feat`, `fix`, `chore`, and `doc`.
- This is a public repo. Never commit client names, personal paths, or credentials.
