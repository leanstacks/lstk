---
name: agents-md-author
description: Creates, audits, or refreshes AGENTS.md agent instruction files (one root file or a nested hierarchy) by investigating a repo's stack, structure, commands, and conventions. First judges existing CLAUDE.md, copilot-instructions, .cursor/rules, and GEMINI.md files for currency. Use when the user wants to bootstrap, generate, refresh, migrate, or consolidate agent instructions or project memory, or asks to make a repo "agent-ready", even without saying "AGENTS.md".
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/scripts/recon.mjs" *)
---

# AGENTS.md Author

Produces accurate, minimal, high-signal `AGENTS.md` files for a repository. Stack-agnostic by design: all stack knowledge comes from discovery, never from assumptions.

## Operating principles

These govern every decision below. Violating them produces files that agents ignore or that actively mislead.

1. **Include only what an agent cannot cheaply infer.** Do not describe what `ls`, the manifest, or the code already shows. Document commands, constraints, conventions that differ from defaults, and traps.
2. **Every command and path must be verified.** A wrong build command is worse than no command. Confirm against manifests, scripts, Makefiles, CI config. Never invent.
3. **Concise beats comprehensive.** Target ≤150 lines for a root file, ≤80 for nested files. Every line competes for the agent's attention. Link to existing docs instead of copying them.
4. **Imperative and testable.** "Run `pnpm test --filter api` before committing" beats "tests are important". Prefer rules an agent can obey or violate unambiguously.
5. **Do not snapshot volatile detail.** No exhaustive file listings, version pins that live in manifests, or counts. Describe stable structure only.
6. **No secrets.** Reference `.env.example` variable _names_ only, never values.
7. **Closest file wins.** In a hierarchy, nested files hold only what is specific to that subtree and never repeat the root.
8. **Record uncertainty.** If something could not be verified, mark it `TODO(verify)` in the plan and tell the user. Do not guess.

## Workflow overview

| Phase | Purpose                           | Gate                                       |
| ----- | --------------------------------- | ------------------------------------------ |
| 0     | Audit existing agent instructions | User decides if existing files are current |
| 1     | High-level reconnaissance         | None                                       |
| 2     | Structural synthesis and plan     | **Wait for user confirmation**             |
| 3     | Create files                      | None                                       |
| 4     | Verify and report                 | None                                       |

Use a task list if one is available so no phase is skipped.

---

## Phase 0: Existing instruction audit

Run the detection script from the repo root (read-only, safe):

```bash
node "${CLAUDE_SKILL_DIR}/scripts/recon.mjs" .
```

If the script cannot run, replicate it manually with `find`/`ls`/`git log`. It reports instruction files, manifests, workspace markers, container/CI files, and, when git is available, how many manifest-touching commits landed after each instruction file's last edit.

Known instruction file locations to check (recursively, not only at root):
`AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/`, `GEMINI.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `.cursorrules`, `.cursor/rules/`, `.windsurfrules`, `.clinerules`, `.junie/guidelines.md`, `CONVENTIONS.md`.

### Freshness assessment

For each file found, test it. Do not rely on modification date alone.

- **Paths:** do the directories and files it references exist?
- **Commands:** do referenced scripts exist in `package.json`, `Makefile`, `pyproject.toml`, `justfile`, `Taskfile`, etc.?
- **Stack:** do named frameworks and tools appear in the manifests? Are removed or replaced tools still mentioned?
- **Drift signal:** many manifest or CI commits after its last edit raises suspicion (the script reports this).
- **Coverage:** does it include build, test, lint, and conventions, or is it a stub?

Classify as **Current**, **Outdated** (state the specific stale items), or **Absent**.

### Branching

- **Current:** Do not regenerate. Show the user the file(s), the evidence of currency, and offer exactly these options:
  1. Convert or consolidate into `AGENTS.md` (single file or hierarchy), preserving content.
  2. Exit the skill.

  Wait for their choice. If they choose conversion, treat the existing content as source material, and still run Phase 1 to confirm the structure supports the layout.

- **Outdated:** Keep the stale files as **source material only**. List the stale items found, then proceed to Phase 1. Reconnaissance is still mandatory; never trust the old content over what the repo shows.
- **Absent:** Proceed to Phase 1.

Multiple tool-specific files that disagree with each other count as Outdated: report the conflicts.

---

## Phase 1: High-level reconnaissance

Do **not** read the whole codebase. Targeted diagnostics only.

1. **File tree discovery.** List the root and one or two levels below it, ignoring dependency and build directories. Identify the stack from manifests (`package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle*`, `*.csproj`, `Gemfile`, `composer.json`, `mix.exs`, etc.). Note lockfiles to identify the package manager (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `uv.lock`, `poetry.lock`). For ecosystem-specific manifests, command sources, generated-code hazards, and monorepo markers, read `references/stack-detection.md` once the stack is identified.
2. **Entry points.** Locate primary execution vectors: `main`/`bin`/`scripts.start` fields, `src/main.*`, `app.*`, `cmd/*`, server and handler configs, framework config files, IaC entry points (`cdk.json`, `serverless.yml`, `template.yaml`, `*.tf`).
3. **Configuration detection.** `.env.example` and similar templates, `Dockerfile`, `docker-compose*.yml`, devcontainer, CI workflows (`.github/workflows`, `.gitlab-ci.yml`, etc.).
4. **Command harvest.** Read only the sections defining scripts or targets in manifests, Makefile/justfile, and CI. CI is the best evidence of the _real_ build, test, and lint sequence.
5. **Convention evidence.** Read linter/formatter/compiler configs (ESLint, Prettier, Ruff, tsconfig, `.editorconfig`, golangci). Sample two or three representative source and test files to detect naming, test layout, and error-handling idioms. Sample, do not crawl.
6. **Existing human docs.** Note `README.md`, `CONTRIBUTING.md`, `docs/`, ADRs. These get linked, not duplicated.

Keep a private list of **traps** discovered: generated code that must not be hand-edited, required codegen steps, non-obvious ordering (migrate before test), slow or flaky suites, protected directories, required env vars.

---

## Phase 2: Structural synthesis

Assess and then present a plan. Produce the following.

- **The Stack:** languages, core frameworks, build tools, package manager, runtime and infra targets (summary form).
- **Architecture at-a-glance:** the folder topography, formatted per `references/architecture-map.md`.
- **Repository structure:** single component or monorepo (list components, their stacks, and how they depend on each other).
- **Layout decision** using the heuristics below.
- **Tool bridging question:** ask the user whether to add tool-specific pointers (see "Tool bridging").

### Layout heuristics

| Situation                                                                               | Layout                                                                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Single component, one stack                                                             | One root `AGENTS.md`                                                                                                          |
| Monorepo, components share conventions                                                  | Root `AGENTS.md` (shared rules, global commands) plus a nested `AGENTS.md` only in components with distinct commands or rules |
| Monorepo, polyglot or very different components                                         | Short root file (map and global rules) plus a nested file per component                                                       |
| Component has a distinct, risky or specialized area (infra, migrations, generated code) | Nested file in that directory                                                                                                 |
| Directory would hold fewer than ~5 unique lines                                         | No nested file; put it in the parent                                                                                          |

Rules for hierarchy:

- Root holds: project purpose (1-2 lines), stack summary, global commands, repo-wide conventions, boundaries, and a pointer list to nested files.
- Nested files hold only what differs or adds. Never restate root content.
- Do not create a nested file per directory. Create one only where an agent working there needs different instructions.

### Plan presentation

Present a concise plan containing:

1. Files to be created, with paths.
2. For each file, a one-line scope statement and an approximate line budget.
3. Rationale for single versus hierarchy, tied to the principles above.
4. Content sourced from outdated existing files, and what was dropped as stale.
5. Items that could not be verified (`TODO(verify)`) and any questions.

**STOP and wait for the user's confirmation or changes. Do not write any file before this.**

---

## Phase 3: Create agentic instructions

Write the confirmed files. Use `references/agents-md-template.md` as the section skeleton, omitting any section with nothing non-obvious to say.

Writing rules:

- Start with a one or two line description of what the project is, not a marketing blurb.
- **Commands go in code blocks**, one per purpose: install, dev/run, build, test (all, single file, single package), lint, format, typecheck, codegen, migrate. Include only those that exist.
- State scope for commands in monorepos (run from root or from the package directory).
- **Boundaries** use three tiers: _Always_ (do without asking), _Ask first_, _Never_. Derive them from real hazards found in Phase 1, not boilerplate.
- Conventions: only those that deviate from language defaults or are not enforced by tooling. If a linter enforces it, say "run the linter" instead of restating the rule.
- Definition of done: the exact checks that must pass before a change is complete.
- Link to docs with relative paths; do not paste them.
- Use no emoji, no filler, no motivational language.
- Do not claim facts you did not verify.

If converting existing content, preserve intent but rewrite to fit these rules; flag anything dropped.

### Tool bridging

Only if the user opted in during Phase 2. `AGENTS.md` is the single source of truth; other files point at it.

| Tool                              | Approach                                                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code                       | `CLAUDE.md` containing a single line `@AGENTS.md` (import syntax). Add Claude-specific notes below it only if the user wants them                                                                                                            |
| GitHub Copilot                    | Recent versions read `AGENTS.md` natively. If the user needs `.github/copilot-instructions.md`, create a symlink from `.github/copilot-instructions.md` to the root `AGENTS.md`, or a short file pointing to it where symlinks are a problem |
| Others (Cursor, Gemini CLI, etc.) | Check whether the tool reads `AGENTS.md` natively; if not, use a symlink or pointer file                                                                                                                                                     |

Notes: symlinks can break on Windows checkouts without developer mode and in some archive or CI flows. Ask whether the team works on Windows before choosing symlinks. Tool support changes quickly; when unsure, say so and offer the pointer-file fallback rather than asserting current behavior.

For hierarchies, bridge files are needed only where the tool does not discover nested `AGENTS.md` itself. Mention this to the user rather than assuming.

---

## Phase 4: Verify and report

Before finishing, check your own output:

1. **Command check:** confirm each documented command exists in a manifest, Makefile, or CI. Where safe and fast, dry-run (`--help`, `--dry-run`, list tasks). Do not run destructive, slow, or networked commands without asking.
2. **Path check:** every referenced path exists.
3. **Duplication check:** nested files repeat nothing from the root.
4. **Budget check:** root ≤150 lines, nested ≤80. Trim aggressively if over.
5. **Secret check:** no credentials, tokens, or real hostnames.
6. **Link check:** relative links resolve.

Report to the user: files created, the layout rationale in one line, what was verified versus marked `TODO(verify)`, anything dropped from legacy files, and a suggestion to review and commit. Recommend revisiting the file when build tooling or structure changes, since stale instructions are the main failure mode.

## Reference files

- `scripts/recon.mjs`: read-only repository diagnostics for Phases 0 and 1.
- `references/stack-detection.md`: per-ecosystem detection signals, command sources, and common traps. Read in Phase 1 after identifying the stack(s).
- `references/architecture-map.md`: format conventions for the architecture at-a-glance section. Read in Phase 2.
- `references/agents-md-template.md`: section skeleton and worked examples. Read at the start of Phase 3.
