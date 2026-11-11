# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugins use semantic versioning.

## [Unreleased]

## [lstk 0.1.0, lstk-guardrails 0.1.0]

### Added

- `lstk` skills: `commit-messages`, `create-pull-request`, `agents-md-author`, `repo-onboarding`, and
  `local-setup-author`, each invokable as `/lstk:<name>`. The three documentation skills cross-link and state which
  output each owns.
- `agents-md-author/scripts/recon.mjs`, a read-only Node repo survey, with tests.
- `lint-plugins` rules: description length cap, `disable-model-invocation` must be `true` or `false`, and relative links
  to `references/`, `scripts/`, and `templates/` must resolve.
- Trigger evals in `tests/evals/` (one JSON file per skill), a shape test that requires an eval file for every skill,
  and a recorded manual run in `tests/evals/RESULTS.md`.
- Marketplace manifest and empty `lstk` and `lstk-guardrails` plugins.
- Tooling: Vitest, oxlint, Prettier, and `scripts/lint-plugins.mjs` with tests.
- Documentation: README, `AGENTS.md`, architecture notes, and contributing guide.
- `lstk-guardrails` hooks: `block-cdk-mutate` denies CDK `deploy`, `destroy`, and `watch` (asks on `bootstrap`), including
  wrapped, chained, and package-script or `make` invocations. `protect-files` blocks edits to `.env` files,
  `package-lock.json`, and `.git/`.
- `.claude/lstk.json` (and optional `.claude/lstk.local.json`) with `protectedPatterns` and `unprotectPatterns`.
- Settings snippets `baseline.json` and `convenience.json`, and `scripts/merge-settings.mjs` (idempotent, dry-run, atomic
  write with `.bak`).
- `/lstk-guardrails:init` skill to merge the snippets into user or project settings.
- Hook behavior matrix (`tests/fixtures/hook-matrix.json`) and tests.

### Changed

- `lstk` is `0.1.0`, and `lstk-guardrails` is promoted from `0.1.0-alpha.1` to `0.1.0`.
- Skill descriptions are third person and under 500 characters.
- `create-pull-request` is user-invoked only (`disable-model-invocation: true`) and sends its body with
  `gh pr create --body-file -`. `git push` and `gh pr ready` prompt.
- `commit-messages` follows the repository's own commit convention first, and uses the four-prefix format only as a
  fallback.
- `recon.sh` became `recon.mjs`, so plugins ship no shell scripts.
- Hooks fail open with a stderr warning on internal errors, instead of failing closed.
- `protect-files` uses path-aware matching: `.environment.ts` and `.env.example` are no longer blocked, and traversal and
  symlinks are resolved.
- Hooks no longer require `jq`.
