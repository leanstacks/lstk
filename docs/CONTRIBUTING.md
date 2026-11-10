# Contributing

## Setup

Requires Node 24 (see `.nvmrc`) and npm.

```bash
npm ci
npm run check        # lint, format check, tests, plugin lint
npm run validate     # optional locally, runs in CI: needs the claude CLI
```

Fix style issues with `npm run format` and `npm run lint:fix`.

## Public-repo checklist

This repo is public. Before every commit, confirm:

- [ ] No client or employer names, project codenames, or internal URLs.
- [ ] No personal paths (such as a home directory), usernames, or email addresses beyond the project's own.
- [ ] No credentials, tokens, account IDs, or ARNs from real environments.
- [ ] Examples use neutral placeholders (`example-app`, `123456789012`).

## Authoring skills

- **Description is the trigger.** Third person: what it does, when to use it, with concrete trigger phrases. Keep it
  tight, because every description sits in context.
- **Progressive disclosure.** Keep `SKILL.md` short. Put detail in `reference.md`, `templates/`, and `examples/`.
- **Scripts for deterministic work, prose for judgment.**
- **Output contracts.** State the exact artifact: path, format, sections.
- **Defer to the repo.** Read `AGENTS.md` and project config first. Apply stack defaults only where the repo is silent.
- **Side effects need explicit invocation.** Set `disable-model-invocation: true` for anything that commits, pushes,
  opens PRs, or writes outside the working tree.
- **Docs and diagrams** are Markdown with Mermaid.
- **Agents** restrict `tools` to the minimum. Plugin agents cannot carry `hooks`, `mcpServers`, or `permissionMode`.
- A skill's `name` equals its directory name. `npm run lint:plugins` enforces this.

## Plugin rules

- Each plugin is self-contained. Never use `../` to reach outside a plugin directory.
- Hook and script code uses Node built-ins only.
- Remove `.gitkeep` placeholders when real content arrives.

## Hooks, matrix, and snippets

- **Add a hook case.** Add a row to `tests/fixtures/hook-matrix.json` (`id`, `hook`, `input`, `legacy`, `target`, and a
  `reason` if the two differ). `tests/hooks/*.test.mjs` assert each row's `target`. Run `npx vitest run tests/hooks`.
- **Add a snippet rule.** Edit `plugins/lstk-guardrails/snippets/baseline.json` (deny and ask) or `convenience.json`
  (allow). `tests/snippets.test.mjs` rejects duplicates, conflicts, and personal paths.
- **Fixtures are public.** Apply the checklist above to every matrix row and fixture.
- Plugins ship no shell scripts or fixtures, and tests must not depend on `bash` or `jq`.

## Versioning

Installed copies are cached by `version`, so **an unbumped change does not reach users**. Bump `version` in the plugin's
`plugin.json` (semver) for every released change. Tag releases `lstk-vX.Y.Z` and `lstk-guardrails-vX.Y.Z`, and record
changes in `CHANGELOG.md`. A release is: bump `version`, update the changelog, run `npm run check`, then tag.

## Commits and pull requests

Commit messages start with a prefix: `feat`, `fix`, `chore`, or `doc`, followed by a short summary, for example
`feat: add plugin lint script`. Open pull requests as drafts, and make sure CI is green before requesting review.
