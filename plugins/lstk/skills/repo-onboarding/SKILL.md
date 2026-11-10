---
name: repo-onboarding
description: Onboard a developer to an unfamiliar repository by producing or verifying an overview document (docs/PROJECT_OVERVIEW.md). First checks whether onboarding docs already exist and are current; points the user to them if so, updates them if stale, and creates them if missing. Use this skill whenever the user is new to a codebase or asks things like "onboard me", "walk me through this repo", "give me an overview", "what is this project", "how is this codebase organized", "how do I get this running", "where do I start", or "explain the architecture" — even if they never mention documentation or onboarding. Also use it when the user asks to refresh, update, or audit an existing project overview or onboarding guide.
---

# Repo Onboarding

Get a developer productive in an unfamiliar repo quickly, and leave behind a durable `docs/PROJECT_OVERVIEW.md` so the next newcomer (human or agent) does not repeat the work.

The skill is stack-agnostic. Stack-specific detection lives in `references/recon-signals.md`; load it only when you need it.

## Operating principles

These exist because the failure modes of onboarding docs are well known: they go stale, they duplicate the README, and they state guesses as facts.

1. **Reuse before you write.** Existing, accurate documentation beats anything you generate. Never duplicate it; link to it.
2. **Evidence over assumption.** Every claim in the output must trace to a file you read or a command output you saw. Label anything inferred as `(inferred)`. Write "unknown" rather than guess. A confident wrong setup step costs a newcomer an hour.
3. **Durable over detailed.** Document what changes slowly: purpose, boundaries, data flow, conventions, how to run things. Avoid exact dependency versions, exhaustive file lists, and line counts. Stable content ages slowly, which keeps the doc trustworthy longer.
4. **Read-only until Phase 3.** Reconnaissance must not install packages, run builds, start servers, or modify files. Never open `.env`, key files, credentials, or secrets; read `.env.example` / `.env.template` only.
5. **Budget your reading.** Do not read the whole repo. Aim for roughly 15–25 targeted file reads for a typical repo. Skim manifests, entry points, and one representative file per architectural layer.

## Workflow overview

| Phase                    | Goal                                            | Output                                     |
| :----------------------- | :---------------------------------------------- | :----------------------------------------- |
| 0. Discovery & freshness | Find existing onboarding docs; judge if current | Verdict: `FRESH`, `STALE`, or `MISSING`    |
| 1. Reconnaissance        | Cheap, structured survey of the repo            | Facts with file evidence                   |
| 2. Synthesis             | Build a mental model                            | Stack, architecture, getting-started, gaps |
| 3. Persist               | Create or update `docs/PROJECT_OVERVIEW.md`     | The document                               |
| 4. Handoff               | Short chat brief + next-step menu               | Conversation                               |

Branching after Phase 0:

- `FRESH` → skip to Phase 4 using the existing doc as the source. Do **not** rewrite it.
- `STALE` → run Phases 1–2 scoped to the sections that drifted, then update in place (Phase 3).
- `MISSING` → run all phases and create `docs/PROJECT_OVERVIEW.md`.

---

## Phase 0: Discovery and freshness verdict

### 0.1 Find candidate documents

```bash
# Prefer git so vendored/ignored files are excluded; fall back to find if not a git repo
git ls-files 2>/dev/null | grep -iE '(^|/)(readme|overview|onboarding|architecture|getting[-_]?started|contributing|claude|agents)[^/]*\.(md|mdx|rst|txt)$'
ls -d docs doc documentation wiki .github 2>/dev/null
```

Classify what you find:

- **Primary onboarding doc**: `docs/PROJECT_OVERVIEW.md`, `docs/ONBOARDING.md`, `ONBOARDING.md`, `ARCHITECTURE.md`, `docs/architecture.md`, `docs/getting-started.md`, or similar. If one exists, it is the file you verify and (if needed) update. Do not create a second competing doc.
- **Supporting sources**: `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `AGENTS.md`, ADRs (`docs/adr/`), package-level READMEs. Read these as inputs and link to them from the overview. A README that is only a blurb or badge list is not an onboarding doc.
- A primary doc that is a stub, an untouched template, or under ~20 meaningful lines counts as `MISSING`.

### 0.2 Judge freshness

Combine three signals; no single one is sufficient.

**Signal A: Verification stamp.** The template places a line like `> **Last verified:** 2026-10-09 · commit \`abc1234\`` near the top. If present:

```bash
git rev-list --count <sha>..HEAD                      # how far behind
git diff --name-status <sha>..HEAD -- . ':!*.lock' ':!*lock.json' | head -100
```

Weigh **structural** changes heavily (Added/Deleted/Renamed): new or removed top-level directories, packages, manifests, entry points, CI, Dockerfiles, IaC. Plain modifications to source files rarely stale an overview.

**Signal B: Git-age comparison (no stamp).** Find the doc's last commit, then list structural changes since:

```bash
git log -1 --format='%H %ad' --date=short -- <doc-path>
git log <that-sha>..HEAD --name-status --diff-filter=ADR --format= -- . | head -100
```

**Signal C: Claim spot-check.** This is the most reliable signal, because it catches drift that git metadata misses. Extract at least 10 verifiable claims from the doc and check each:

- Paths and directories it mentions (do they exist?)
- Commands and script names (`npm run x`, `make y`: are they defined in the manifest/Makefile?)
- Named technologies (still in the dependency manifest?)
- Env var names (still in `.env.example` or config code?)
- Entry points and package names

### 0.3 Verdict

| Condition                                                                                                               | Verdict   |
| :---------------------------------------------------------------------------------------------------------------------- | :-------- |
| No primary doc, or only a stub                                                                                          | `MISSING` |
| 0 failed claims **and** no structural changes since last verified (or git history unavailable but spot-check clean)     | `FRESH`   |
| Any failed claim, **or** structural changes since last verified, **or** doc is >50 commits behind with structural churn | `STALE`   |

If git history is unavailable, say so and base the verdict on Signal C alone. Report the verdict to the user in one or two lines with the evidence (e.g. "3 of 12 claims failed: `packages/worker/` no longer exists; `npm run seed` is not defined").

---

## Phase 1: Reconnaissance

Run in order. Stop each step as soon as you have what you need. Load `references/recon-signals.md` for manifest-to-ecosystem mappings, entry-point heuristics, and monorepo markers.

1. **Tree and stack.** Survey the top two levels (`git ls-files | cut -d/ -f1-2 | sort -u | head -150`). Identify languages and package managers from manifests. Detect whether this is a monorepo (workspaces, multiple manifests, `packages/`, `apps/`, `services/`).
2. **Entry points.** Locate how the system starts: `main` / `bin` / `scripts.start` in manifests, server bootstraps, handler directories, CLI entry files, `Procfile`, Dockerfile `CMD`/`ENTRYPOINT`, IaC app entry.
3. **Configuration.** Find `.env.example` and similar templates, config directories, feature-flag files, and container/orchestration files (`Dockerfile`, `docker-compose.yml`, Helm, Compose overrides). List required env var _names_, never values.
4. **Build, test, lint, CI.** Read the manifest scripts / `Makefile` / `justfile` / `tox.ini` / CI workflow files to learn the real commands for build, test, lint, and run.
5. **Infrastructure and deployment.** Note IaC (CDK, Terraform, Pulumi, Serverless, CloudFormation, k8s manifests) and where deploy is defined.
6. **Targeted reading.** Read the README and any supporting docs found in Phase 0, then one representative file per layer (a handler, a service, a model, a component, a test). Skim `git log --oneline -15` to understand recent direction.
7. **Dependency direction.** In layered code, note which layers import which (a quick `grep` of import statements across directories is enough). One-way dependency chains are worth documenting.

**Large repos.** If there are more than ~5 packages/services, and your environment supports subagents, delegate one exploration per package with the instruction: "Return ≤150 words: purpose, entry point, key dependencies, how to test it. Cite file paths." Then synthesize. Otherwise sample the most central packages and say which ones you did not examine.

**Never read:** `.env*` (except templates), `*.pem`/`*.key`, credential files, user-secrets stores (`secrets.json`), `node_modules`, `vendor`, `dist`/`build`/`target` output, .NET `bin/` and `obj/`, lockfiles (identify the package manager from their filename only), generated code, large binaries.

---

## Phase 2: Synthesis

Assemble the following from Phase 1 evidence. Format conventions are in `references/architecture-map.md`.

- **Purpose** (1–3 sentences). Sourced from README or inferred from code; mark inferred.
- **The stack**: languages, frameworks, build tooling, runtime/hosting, key external services.
- **Architecture at a glance**: annotated folder map, component relationships, and the end-to-end flow of the primary use case.
- **Central contracts**: the main shared types, schemas, API definitions, or database models that the rest of the system depends on. Point to the file; do not copy it wholesale.
- **Getting started recipe**: ordered steps derived strictly from manifests, scripts, `.env.example`, and container files. Mark the recipe as _derived, not executed_ unless you actually ran it.
- **Development workflow**: how to build, test, lint, and where CI runs them.
- **Conventions and gotchas**: naming, layering rules, error-handling patterns, generated files, anything that would trip a newcomer. Only include what you observed.
- **Open questions**: things you could not determine. Do not hide these; they are valuable to the maintainers.

---

## Phase 3: Persist the document

Use `references/overview-template.md` for structure and per-section guidance.

**If `MISSING`:** create `docs/PROJECT_OVERVIEW.md` (create `docs/` if needed). Do not commit; leave that to the user.

**If `STALE`:** edit the existing primary doc **in place**, even if it is not named `PROJECT_OVERVIEW.md`. Rules:

- Make surgical edits. Fix what is wrong; preserve human-authored prose, tone, and structure that remain accurate.
- Add missing sections from the template only where the evidence supports them.
- Delete claims you have proven false rather than hedging them.
- Do not reformat or reorder untouched sections; keep the diff reviewable.
- Update the verification stamp (below).
- In chat, summarize exactly what changed and why (a short list is fine).

**If `FRESH`:** change nothing.

**Verification stamp.** On create or update, set the line near the top of the doc:

```bash
echo "> **Last verified:** $(date +%F) · commit \`$(git rev-parse --short HEAD 2>/dev/null || echo n/a)\`"
```

Only stamp what you actually verified. If you updated a subset of sections, the stamp is still valid only if the spot-check of the remaining sections passed in Phase 0.

**Quality bar before saving:**

- [ ] Every path, command, and env var named in the doc was checked to exist
- [ ] Inferences are labeled; unknowns are listed under Open Questions
- [ ] No secrets, tokens, or internal hostnames copied in
- [ ] No duplication of README content; links used instead
- [ ] Scannable: headings, tables, short paragraphs; Mermaid for diagrams
- [ ] Reasonable length (typically 150–300 lines; longer only for large monorepos)

---

## Phase 4: Welcome brief and handoff

Keep the chat output shorter than the document: the document is the deliverable, the brief is the front door.

**Brief structure** (adapt for `FRESH`, where you summarize the existing doc and point to it rather than restating it):

1. **Doc status**: one line. "Created `docs/PROJECT_OVERVIEW.md`", "Updated 4 sections of `docs/ONBOARDING.md` (it referenced removed packages)", or "`docs/PROJECT_OVERVIEW.md` is current as of `abc1234`; here is the short version."
2. **What this is**: 1–2 sentences.
3. **Stack**: one line.
4. **Shape**: the 3–6 most important directories/components and how they connect.
5. **Run it**: the shortest path to a running local environment, with any prerequisites or env setup called out. State that it is derived, not executed.
6. **Watch out for**: top 1–3 gotchas or open questions.

Then transition using `references/questionnaire.md`: ask what the developer wants to do next, offering the menu from that file, and calibrate depth to their answer. Offer (do not perform without consent) to run install/build/tests to validate the getting-started recipe, since those commands have side effects and can be slow.

---

## Edge cases

- **Not a git repo / shallow clone:** skip Signals A and B; use Signal C; omit the commit from the stamp (`n/a`) and note it.
- **Empty or near-empty repo:** report what exists, do not fabricate architecture; create a minimal doc listing what is present and what is unknown.
- **Multiple apps in one repo:** one overview, one section per app/package under "Repository structure", plus a top-level diagram of how they relate.
- **Conflicting sources** (README says one thing, code another): trust the code, note the discrepancy under Open Questions, and mention it to the user.
- **User only wants a quick look:** still do Phase 0–2 and give the Phase 4 brief; ask before writing the file if they signaled they do not want repo changes.
- **A `CLAUDE.md` / `AGENTS.md` exists:** read it for conventions and commands; link to it rather than copying. Do not modify it.
