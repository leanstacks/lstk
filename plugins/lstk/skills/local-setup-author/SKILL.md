---
name: local-setup-author
description: Creates, verifies, or updates docs/LOCAL_SETUP.md, the guide from a fresh clone to a running app and a working edit-build-test loop. Audits existing docs (README, CONTRIBUTING, devcontainer) first, then reuses, updates, or creates. Use when the user asks how to set up, run, build, or develop a repo locally, wants a getting-started or dev environment guide, or asks to audit setup instructions. Stack-agnostic.
---

# Local Setup Author

Produce a `docs/LOCAL_SETUP.md` that gets a new engineer from fresh clone to a running application and a working change loop (edit, build, test) with no tribal knowledge. Leave a durable, verifiable document behind so nobody repeats the discovery work.

This skill is stack-agnostic. Ecosystem-specific detection tables live in `references/setup-signals.md`; the document structure lives in `references/local-setup-template.md`. Load each when its phase calls for it, not before.

Scope boundary: this document covers **how to run and change the code on a laptop**. Architecture, domain concepts, and repo tour belong in a project overview (e.g. `docs/PROJECT_OVERVIEW.md`); link to it if it exists, and do not restate it.

## Operating principles

Setup guides fail in predictable ways: a step silently depends on something the author already had installed, secrets are mentioned but never located, versions drift, and the guide duplicates a README that then disagrees with it. The principles below target those failures.

1. **Reuse before you write.** Accurate existing instructions beat generated ones. Link to them or consolidate them; never create a competing second source of truth without telling the user.
2. **Evidence over assumption.** Every command, version, port, variable name, and service in the guide traces to a file you read (manifest, script, compose file, CI workflow, `.env.example`). Mark anything inferred as `(inferred)` and anything unverifiable as `unknown`. A confident wrong step costs a newcomer an hour; an honest gap costs one question.
3. **CI is the best witness.** CI workflows run the real install/build/test commands from a clean machine on every change. When a README and CI disagree, trust CI and record the discrepancy.
4. **Setup facts are less durable than architecture facts, so make them re-verifiable.** Prerequisite versions _do_ belong in this document because they gate setup, but cite the file that pins them (`.nvmrc`, `engines`, `global.json`, `.tool-versions`) so a reader can re-check. Reference commands by the file that defines them.
5. **Read-only until Phase 3.** Reconnaissance does not install, build, run, start containers, or write files. **Never open** `.env`, `.env.local`, `*.pem`, `*.key`, credential files, `secrets.json`, `local.settings.json` (open its `.sample`), or `~/.aws`-style user config. Read templates (`.env.example`, `*.sample`, `*.template`) only. Record variable _names_, never values.
6. **Ordered by dependency, verified at each step.** Every step in the final guide ends with a check that tells the reader it worked, so failures surface where they occur instead of three steps later.
7. **Budget your reading.** Target roughly 15 to 25 targeted file reads. Skim manifests, scripts, compose/container files, CI, and env templates. Do not read application source beyond what is needed to find ports, env var names, and external service dependencies.

## Workflow overview

| Phase                   | Goal                                                  | Output                                                          |
| :---------------------- | :---------------------------------------------------- | :-------------------------------------------------------------- |
| 0. Audit existing docs  | Find setup content wherever it lives; judge freshness | Verdict: `FRESH`, `STALE`, `SCATTERED`, or `MISSING`            |
| 1. Reconnaissance       | Cheap survey: stack, layout, runnable units           | Facts with file evidence                                        |
| 2. Structural synthesis | Gather setup facts; propose the guide                 | Findings summary + outline, **then wait for user confirmation** |
| 3. Create or update     | Write `docs/LOCAL_SETUP.md`                           | The document                                                    |
| 4. Summary              | Report actions, decisions, duplication                | Short chat report                                               |

Branching after Phase 0:

- `FRESH` → stop. Point the user to the existing document with a two-line summary. Change nothing.
- `STALE` → Phases 1–2 scoped to what drifted; update in place in Phase 3.
- `SCATTERED` or `MISSING` → all phases; create the document.

---

## Phase 0: Audit existing documentation

### 0.1 Find candidate documents

```bash
# Prefer git so ignored/vendored files are excluded; fall back to find if not a git repo
git ls-files 2>/dev/null | grep -iE '(^|/)(readme|local[-_]?setup|setup|development|developing|dev[-_]?guide|getting[-_]?started|contributing|onboarding|install|claude|agents|project_overview)[^/]*\.(md|mdx|rst|txt|adoc)$'
ls -d docs doc documentation .devcontainer .github 2>/dev/null
# Setup-flavored sections buried inside larger docs
grep -n -iE '^#{1,4} .*(prereq|install|setup|set up|getting started|development|local|running|run |quick ?start|build)' README.md CONTRIBUTING.md 2>/dev/null
```

Classify findings:

- **Primary setup doc**: `docs/LOCAL_SETUP.md` (the target). If a dedicated setup doc exists under another name (`docs/DEVELOPMENT.md`, `SETUP.md`), treat it as the primary doc for the verdict, and ask the user in Phase 2 whether to update it in place or create `docs/LOCAL_SETUP.md` and retire the other. Do not silently create a competitor.
- **Embedded setup content**: setup sections inside `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`/`AGENTS.md`, package-level READMEs. These are inputs. Record which sections, in which files, and roughly how complete each is (prerequisites? env? services? verify step?). You will need this for the duplication report in Phase 4.
- **Executable setup**: `.devcontainer/`, `Makefile`/`justfile` targets such as `setup` or `bootstrap`, `scripts/setup*`, `docker-compose*.yml`. These are the strongest sources; the doc should explain and link them, not paraphrase them from memory.
- A setup doc that is an untouched template, a stub, or under ~20 meaningful lines counts as `MISSING`.

### 0.2 Judge freshness (only if a primary setup doc exists)

Combine three signals. No single one is sufficient.

**Signal A: verification stamp.** The template places `> **Last verified:** YYYY-MM-DD · commit \`abc1234\`` near the top. If present, measure drift in **setup-relevant paths only**; ordinary source changes rarely invalidate setup instructions:

```bash
git rev-list --count <sha>..HEAD
git diff --name-status <sha>..HEAD -- \
  '*package.json' '*pyproject.toml' '*requirements*.txt' '*go.mod' '*Cargo.toml' '*pom.xml' '*build.gradle*' \
  '*.csproj' '*.sln' '*.slnx' 'global.json' 'Directory.*.props' '*Gemfile' '*composer.json' \
  'Makefile' 'justfile' 'Taskfile.yml' '.nvmrc' '.node-version' '.python-version' '.tool-versions' \
  '*Dockerfile*' '*docker-compose*' '.devcontainer/*' '.env.example' '.env.sample' '*.env.template' \
  '.github/workflows/*' '.gitlab-ci.yml' 'Jenkinsfile' 'scripts/*' '*launchSettings.json' \
  '*appsettings*.json' 'cdk.json' '*.tf' 'serverless.yml' 'template.yaml' | head -100
```

Added, deleted, or renamed entries weigh heavily (new service, removed script, new manifest). Modified manifests weigh moderately: inspect the diff for changed `scripts`, `engines`, or service definitions.

**Signal B: git-age comparison (no stamp).** `git log -1 --format='%H %ad' --date=short -- <doc-path>`, then run the same path-filtered diff from that commit.

**Signal C: claim spot-check.** The most reliable signal because it catches drift git metadata misses. Extract at least 10 verifiable claims and check each against the repo:

- Commands and script names (`npm run dev`, `make seed`): defined in the manifest/Makefile?
- Prerequisite versions: match the pin files and CI matrix?
- Paths and files (`cp .env.example .env`): exist?
- Env var names: present in the `.env.example` or config code?
- Compose service names, ports, profiles: match the compose file?
- Health/verify endpoints and expected ports: still defined?
- Referenced scripts, migration/seed commands, and tool names: still present?

### 0.3 Verdict

| Condition                                                                                                                              | Verdict                                                         |
| :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| No primary doc and no meaningful setup content elsewhere, or only a stub                                                               | `MISSING`                                                       |
| No primary doc, but setup content exists in README/CONTRIBUTING/other docs                                                             | `SCATTERED` (create the guide; consolidate; report duplication) |
| Primary doc exists, 0 failed claims, no setup-relevant structural changes since last verified (or no git history and spot-check clean) | `FRESH`                                                         |
| Primary doc exists with any failed claim, or setup-relevant structural changes, or CI commands disagree with the doc                   | `STALE`                                                         |

If git history is unavailable, say so and rely on Signal C. Report the verdict in one or two lines with evidence (for example: "4 of 12 claims failed: `npm run seed` is no longer defined; Node pin moved to 22 in `.nvmrc`; compose file renamed the `db` service to `postgres`").

**On `FRESH`, stop here:** tell the user where the document is, summarize it in a few lines, and offer to validate it by running it (with consent; see Phase 4).

---

## Phase 1: High-level reconnaissance

Goal: know what kind of repo this is so Phase 2 reads only what matters. Load `references/setup-signals.md` now.

1. **Layout and stack.** Survey two levels: `git ls-files | cut -d/ -f1-2 | sort -u | head -150`. Identify languages, package managers (from manifests; lockfiles by _filename only_), and whether this is a monorepo (workspaces, multiple manifests, `apps/`, `packages/`, `services/`, a `.sln`).
2. **Runnable units.** List what a developer would actually start: web server, SPA dev server, worker, CLI, serverless handlers (local emulation), mobile app. Each runnable unit gets its own run instructions later.
3. **Setup affordances.** Note which of these exist: devcontainer, compose file, Makefile/justfile/Taskfile, `scripts/` bootstrap, version pin files, pre-commit hooks, env templates. Their presence decides the shape of the guide (see "Choosing the primary path" below).
4. **Size the job.** More than ~5 deployable units or packages with distinct setup needs: plan one section per unit under a shared prerequisites/services core, and use subagents if available ("Return ≤150 words: runtime, install, run, test, required env names, required services. Cite file paths").

---

## Phase 2: Structural synthesis

Targeted reads to collect the facts the guide needs. Use the per-category tables in `references/setup-signals.md`. Collect:

| Fact                                                                 | Primary sources                                                                                               |
| :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| Prerequisites: runtimes, SDKs, CLIs, version pins                    | pin files, `engines`, `TargetFramework`/`global.json`, CI setup steps, Dockerfile base image                  |
| System dependencies: native libs, compilers, OS constraints          | Dockerfile `apt`/`apk` lines, CI install steps, README, scripts using OS-specific commands                    |
| Accounts and access: package registries, VPN, cloud profiles, SSO    | `.npmrc`/`nuget.config`/`pip.conf` registry hints (names only), README, scripts that call `aws`/`gcloud`/`az` |
| Environment variables: names, purpose, required vs optional          | `.env.example`, config code, compose `environment:`, CI `env:`                                                |
| Supporting services: DB, cache, queue, search, mock/emulator         | compose file, devcontainer, CI `services:`, IaC, SDK imports, emulator tooling                                |
| Install and pre-build steps: dependencies, codegen, migrations, seed | manifest scripts, Makefile, CI, ORM/migration config                                                          |
| Run commands and ports per unit; verify endpoint                     | scripts, launch profiles, Dockerfile `EXPOSE`/`CMD`, health route in code                                     |
| Test, lint, type-check commands; test prerequisites (DB, Docker)     | manifest scripts, CI, test config, Testcontainers use                                                         |
| Editor/tooling conventions worth setting up                          | `.editorconfig`, pre-commit/husky, recommended extensions file                                                |
| Local vs. external split                                             | which dependencies run in containers, which are mocked, which hit shared dev/staging cloud resources          |

### Choosing the primary path

Pick one **recommended path** and document alternatives briefly. Prefer, in order: (1) devcontainer, if present and CI-aligned; (2) a bootstrap script/Make target that the repo already maintains; (3) compose for services plus native runtime for the app; (4) fully manual steps. Whatever the repo's own automation does, the guide explains and links; it does not reimplement it by hand.

### Present findings and wait

Do not write the file yet. Present, concisely:

1. **Verdict** and the evidence behind it.
2. **Findings summary**: stack, runnable units, recommended path, prerequisites (with pin source), services, env var names (count, plus which need secrets), and anything surprising.
3. **Proposed outline** of `docs/LOCAL_SETUP.md`: the section list you will use, with a one-line note on any section being added, merged, or dropped and why.
4. **Decisions needed** (ask only what the repo cannot answer): where secrets/credentials are obtained, whether to update a differently named setup doc in place, whether the guide should cover Windows, and which of several viable paths to recommend.
5. **Duplication preview**: which existing docs already contain setup content the guide will overlap.
6. **Open questions** you could not resolve.

Then **stop and wait for the user's confirmation or changes.** If they said earlier they want no questions and no pause, proceed, but still include these points in the Phase 4 summary.

---

## Phase 3: Create or update the document

Use `references/local-setup-template.md` for structure and per-section guidance. The template is a starting point: drop sections that have no evidence-backed content, and keep section names the repo's existing doc already uses when updating.

**Creating** (`MISSING`/`SCATTERED`): write `docs/LOCAL_SETUP.md` (create `docs/` if needed). Do not commit.

**Updating** (`STALE`): edit in place with surgical changes. Fix what is wrong, preserve accurate human-authored prose and structure, delete proven-false claims rather than hedging them, do not reorder untouched sections, keep the diff reviewable, refresh the stamp. Summarize what changed and why.

**Writing rules**

- Commands are copy-pasteable, in fenced blocks, one purpose per block, run from a stated directory (default: repo root).
- Each step ends with a **verify** line (command and expected outcome).
- State _where secrets come from_ only if the repo says so (README, `.env.example` comments, scripts). Otherwise list it under Open Questions. Never invent a team channel, vault name, or wiki link.
- Troubleshooting entries come from evidence: warnings in docs or scripts, CI workarounds, port collisions derivable from config, version-mismatch failures implied by pins. Label derived-but-unobserved items `(anticipated)`. Never fabricate error messages you did not see in the repo.
- Add: `_Derived from <files>; not executed during generation._` unless you actually ran the steps.
- Link to the project overview, README, and CLAUDE.md/AGENTS.md instead of copying them. Mermaid for the local architecture diagram, and only edges you verified.

**Verification stamp.** On create or update:

```bash
echo "> **Last verified:** $(date +%F) · commit \`$(git rev-parse --short HEAD 2>/dev/null || echo n/a)\`"
```

The stamp is valid only for what was checked. If you updated a subset of sections, it stands only if the Phase 0 spot-check of the remaining sections passed.

**Quality bar before saving**

- [ ] Every command, script, path, port, service, and env var name was checked to exist in the repo
- [ ] Prerequisite versions cite their pin source and agree with CI
- [ ] Steps are in dependency order; each has a verify check
- [ ] A reader can find out where to get every required secret or access grant, or it is listed under Open Questions
- [ ] No secret values, tokens, or internal hostnames copied in
- [ ] Inferred and anticipated items are labeled; unknowns are listed
- [ ] Setup content is linked, not duplicated, wherever an accurate source exists
- [ ] Typically 120–250 lines; longer only for multi-unit monorepos

---

## Phase 4: Summary

Keep it shorter than the document. Include:

1. **Actions**: what was created or changed, and the file path.
2. **Decisions and rationale**: the recommended path chosen and why, sections added or omitted, how conflicts between sources were resolved (code and CI win over prose).
3. **Duplication report.** List each existing document that overlaps the new guide: file, section, and degree (full, partial, or conflicting). For each, give a recommendation the user can accept or ignore, such as "README `## Getting Started` repeats steps 3–6; consider replacing it with a link to `docs/LOCAL_SETUP.md`". **Do not edit those documents.** Flag any places where existing docs _contradict_ the new guide, since those are more urgent than plain duplication.
4. **Open questions** that need a human (secrets sources, access grants, unclear steps).
5. **Offer to validate.** Offer (do not perform without consent) to run install, services, build, and tests to prove the recipe, since those commands have side effects, can be slow, and may need credentials.

---

## Edge cases

- **Not a git repo or shallow clone:** skip Signals A and B, use Signal C, stamp commit as `n/a`.
- **Empty or near-empty repo:** document only what exists; do not invent a setup. Produce a minimal guide with unknowns listed.
- **Monorepo:** shared prerequisites and services once, then a per-unit section (install, run, test, ports). Include a package table only if it helps.
- **No setup automation, no docs, no CI:** derive from manifests alone, label the result `(inferred)` throughout, and recommend the user validate it.
- **Conflicting sources:** trust CI and code over prose; note the discrepancy under Open Questions and in the Phase 4 duplication report.
- **Cloud-dependent app with no local substitute:** say so plainly in the architecture section, document how a developer obtains access (only as far as the repo says), and do not pretend it runs offline.
- **Existing `CLAUDE.md`/`AGENTS.md`:** read for commands and conventions, link to it, never modify it.
- **User wants only a quick answer, no file:** do Phases 0–2, give the summary, and ask before writing.
