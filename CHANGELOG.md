# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugins use semantic versioning.

## [Unreleased]

### Added

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

- `lstk-guardrails` version is `0.1.0-alpha.1`.
- Hooks fail open with a stderr warning on internal errors, instead of failing closed.
- `protect-files` uses path-aware matching: `.environment.ts` and `.env.example` are no longer blocked, and traversal and
  symlinks are resolved.
- Hooks no longer require `jq`.
