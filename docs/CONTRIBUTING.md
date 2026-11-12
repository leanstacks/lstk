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
- **Every skill needs trigger evals.** Add `tests/evals/<skill>.json` (at least 3 prompts, both `shouldTrigger` values,
  one near-miss). `tests/evals.test.mjs` fails without it. Run the set manually and record it in
  `tests/evals/RESULTS.md`. See `tests/evals/README.md`.
- A skill's `name` equals its directory name. `npm run lint:plugins` enforces this.

## Review fixture

`tests/fixtures/sample-repo/` is test data for the M4 review skills. It carries **deliberately seeded defects**
(listed in its `SEEDED-ISSUES.md`), including a vulnerable `lodash` pin in its `package.json` and a plainly fake secret.
It is never installed, built, or run.

- Do not run `npm audit` or any dependency scan against it, and keep it out of CI scans.
- If Dependabot or another scanner is added, exclude `tests/fixtures/` (the repo has no `dependabot.yml` today).
- `tests/fixtures.test.mjs` checks that every `path:line` in the answer key still matches the fixture. Update both
  together.
- Use only placeholder values (`111111111111`, obviously invalid keys).

## Prototype templates

`plugins/lstk/skills/prototype/templates/` holds the Vite + React and Lambda starters that the `prototype` skill copies
into a user's repo. They are plugin files, not part of this repo's own build.

- oxlint ignores the directory (see `.oxlintrc.json`). Vitest only runs `tests/**/*.test.mjs`, so template tests never
  run here. Prettier still checks the files, so keep them formatted.
- Never run `npm install` or `npm audit` inside `templates/`, and never commit a lockfile or `node_modules` there. Keep
  the directory out of Dependabot and any dependency scan if one is added (the repo has no `dependabot.yml` today).
- Every dependency in a template `package.json` is pinned to an exact version. `tests/prototype-skills.test.mjs`
  enforces it. Record the pin date in the CHANGELOG entry of each release that touches the templates.
- Templates carry no `.env`, no lockfile, and no `../` path, so `protect-files` and `lint:plugins` stay quiet.
- A skill directory without a `SKILL.md` fails `lint:plugins`, and a skill with a `SKILL.md` needs
  `tests/evals/<skill>.json`. Add a stub `SKILL.md` and its eval file in the same commit as the first template.

## Dependency triage

`lstk` has no `dependency-audit` skill (the M4 value gate failed). To triage `npm audit` output, run `npm audit --json`
yourself and ask Claude to check, for each advisory, whether the vulnerable package or function is used, whether it is a
dev or runtime dependency, and whether removing or upgrading is the lowest-risk fix. Never run `npm audit fix --force`
without reading what it changes.

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
changes in `CHANGELOG.md`. A release is: bump `version`, update the changelog, run `npm run check` and `npm run validate`, smoke-test the install
in a scratch repo, then tag after merge.

## Commits and pull requests

Commit messages start with a prefix: `feat`, `fix`, `chore`, or `doc`, followed by a short summary, for example
`feat: add plugin lint script`. Open pull requests as drafts, and make sure CI is green before requesting review.
