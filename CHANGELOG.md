# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugins use semantic versioning.

## [Unreleased]

## [lstk 0.4.0]

### Added

- `lstk` skills `prototype` and `promote-prototype`. Both set `disable-model-invocation: true`.
  - `prototype` scaffolds a throwaway prototype in `prototypes/<name>/` in one of two shapes (`web`: Vite, React, and
    TypeScript with a mocked API, or `lambda`: one handler with local invocation and a test). It writes `PROTOTYPE.md`
    with seven fixed sections that state "throwaway by default", what is faked, and known shortcuts. It ships
    templates and `scripts/scaffold.mjs` (Node built-ins only), which refuses a non-empty target and path traversal.
  - `promote-prototype` reads a prototype statically and writes `prototypes/<name>/PROMOTION-GAPS.md`: a cited gap list
    with relative effort (`S`, `M`, `L`, `XL`, never hours or cost), a promotion order, and `Not reviewed` and
    `Confidence and limits` sections.
- Prototypes and guardrails notes in the README and `docs/ARCHITECTURE.md`. Both skills run with the guardrail hooks on,
  prototypes do not deploy, and the skills never ask a user to weaken a guardrail. `promote-prototype` limits itself to
  one report file by instruction.
- Tests: scaffold script tests (including the real `protect-files` hook over every scaffolded path), template
  structure and pinned-dependency checks, a guardrail-wording check on skill text, and example headings checked against
  each contract.
- Worked examples `docs/examples/prototype.md` and `docs/examples/promote-prototype.md`, and manual run records in
  `tests/evals/RESULTS.md`.

### Changed

- `lstk` is `0.4.0`. `lstk-guardrails` is unchanged.
- Template dependencies are pinned to exact versions as of 2026-11-12. Run `npm install`, then `npm outdated`, in a new
  prototype.

## [lstk 0.3.0]

### Added

- `code-reviewer` agent (read-only: `Read`, `Grep`, `Glob`). The caller supplies the diff or a path list and the intent.
  It returns a fixed-format report with cited findings.
- `lstk` skills `architecture-review`, `threat-model`, and `cdk-iam-review`. Each writes a report under `docs/` with a
  fixed section order, a shared severity scale (`high`, `medium`, `low`, `info`) and finding schema, and `Not reviewed`
  and `Confidence and limits` sections. All three set `disable-model-invocation: true`. `cdk-iam-review` covers AWS CDK
  TypeScript only, never runs `synth`, and reads cdk-nag output only if present.
- Review fixture `tests/fixtures/sample-repo/` with eight seeded issues and an answer key, tested for drift.
- Trigger evals for the agent and the three skills, recorded manual runs in `tests/evals/RESULTS.md`, and worked
  examples in `docs/examples/`.
- Tests: agent eval support, required output-contract and limits sections for the review skills, and example headings
  checked against each output contract.

### Changed

- `lstk` is `0.3.0`. `lstk-guardrails` is unchanged.

### Decided

- `dependency-audit` is not built. A hand run showed only reachability as added value, which a plain prompt already
  gives. See `docs/plans/PLAN-M4.md`, Phase 6.

## [lstk 0.2.0]

### Added

- `lstk` skills: `stack-profile` (reference-only, `user-invocable: false`), `tech-eval`, `adr-author`, and
  `solution-outline`.
- `researcher` agent (read-only, `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch`) that `tech-eval` runs in parallel, one
  per option.
- Trigger evals for the four new skills, and worked examples in `docs/examples/` built on one fictional scenario.
- `lint-plugins` rules: agents must declare a non-empty `tools` list that excludes `Bash`, `Write`, `Edit`, and
  `NotebookEdit`. A test requires `docs/examples/<skill>.md` for `tech-eval`, `adr-author`, and `solution-outline`.
- `ARCHITECTURE.md` notes on agent frontmatter and reference-skill behavior, verified on Claude Code 2.1.322.

### Changed

- `lstk` is `0.2.0`. `lstk-guardrails` is unchanged.

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
