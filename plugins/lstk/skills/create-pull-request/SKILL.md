---
name: create-pull-request
description: Create a high-quality GitHub pull request from the current branch. Finds and follows the repository's own PR template (e.g. .github/PULL_REQUEST_TEMPLATE.md), falls back to a best-practice template when none exists, writes a clear PR title, and opens the PR as a DRAFT by default. Use this skill whenever the user asks to open, create, raise, submit, or publish a pull request or PR, says "push this up for review", asks to write or fix a PR title or description, or finishes a feature/fix and wants it reviewed — even if they never say "pull request" explicitly.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git show:*), Bash(git rev-parse:*), Bash(gh pr create:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr edit:*), Bash(gh repo view:*), Read, Glob, Grep
---

# Create Pull Request

Open a pull request that a reviewer can understand in under two minutes. A good PR explains **why** the change exists, **what** changed at a level the diff doesn't already show, **how to verify it**, and **what could go wrong**.

Defaults, in priority order:

1. The repository's own PR template always wins over the fallback in this skill.
2. Open the PR as a **draft** unless the user explicitly asks for it to be ready for review.
3. Never claim something is done or verified unless it actually was (see [Checklist honesty](#checklist-honesty)).

## Workflow

### 1. Preflight

Run these and read the output before writing anything:

```bash
git status --short --branch          # uncommitted changes, current branch, upstream tracking
git rev-parse --abbrev-ref HEAD      # current branch
gh repo view --json defaultBranchRef,isFork,parent -q '.'   # default (base) branch, fork info
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state all   # does a PR already exist?
```

Then decide:

| Situation                                                               | Action                                                                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Current branch is the default branch (`main`, `master`, `develop`, ...) | Stop. Ask the user which branch to use or offer to create one. Never open a PR from the default branch.                                 |
| Uncommitted changes exist                                               | Ask whether to commit them first. Do not commit or stash on the user's behalf unprompted.                                               |
| An open PR already exists for this branch                               | Do not create a second one. Update it with `gh pr edit` (title/body) after confirming with the user, and return its URL.                |
| No commits ahead of base                                                | Stop and tell the user there is nothing to propose.                                                                                     |
| Repo is a fork                                                          | Target the upstream repo's default branch unless told otherwise (`gh pr create --repo <upstream>` with `--head <fork-owner>:<branch>`). |

Use the repo's default branch as the base unless the user names another one, or the branch clearly stacks on a feature branch (in which case confirm).

### 2. Understand the change

Base the PR content on the real diff and history, not on memory of the conversation:

```bash
git log --oneline <base>..HEAD
git diff <base>...HEAD --stat
git diff <base>...HEAD            # read it; for very large diffs, read file by file
```

Collect:

- **Intent**: the _why_ — the bug, requirement, ticket, or user story. Pull it from the user's request, commit messages, branch name, and linked issue.
- **Issue references**: GitHub `#123` or Jira-style keys (`PROJ-123`) from the branch name, commit messages, or user prompt.
- **Risk signals**: DB migrations, config or environment variable changes, infrastructure/IaC changes, IAM/permission changes, API contract changes, dependency bumps, feature flags, deleted code.
- **Tests**: which tests were added or changed, and which (if any) you actually ran in this session.

If the diff mixes unrelated concerns or is very large (rule of thumb: > ~400 changed lines of non-generated code), say so and suggest splitting. Reviewers' attention degrades quickly on large PRs. Don't block on it; flag it and let the user decide.

### 3. Locate the PR template

Search in this order and **use the first match**. GitHub treats these filenames case-insensitively:

1. `.github/PULL_REQUEST_TEMPLATE.md`
2. `PULL_REQUEST_TEMPLATE.md` (repo root)
3. `docs/PULL_REQUEST_TEMPLATE.md`
4. `.github/PULL_REQUEST_TEMPLATE/*.md` (multiple templates; see below)
5. Other platforms, if the remote is not GitHub: `.gitlab/merge_request_templates/*.md` (GitLab)

One-liner to find candidates regardless of case or location:

```bash
find . \( -path ./node_modules -o -path ./.git \) -prune -o \
  \( -iname 'pull_request_template*' -o -ipath '*/pull_request_template/*.md' \) -print
```

Notes:

- **GitHub reads templates from the default branch.** If the current branch predates the template, the file may be missing locally. Check with `git show origin/<default>:.github/PULL_REQUEST_TEMPLATE.md` before concluding none exists.
- **Multiple templates** (directory form): pick the one that matches the change type by filename (`bugfix.md`, `feature.md`, `hotfix.md`, ...). If more than one plausibly fits, ask the user. Don't guess.
- **Also check `CONTRIBUTING.md`** (and `docs/`) for PR conventions on titles, labels, reviewers, or required sections, even when a template exists.
- Organization-wide default templates live in the org's `.github` repository and are not available locally. If no repo template is found, proceed with the fallback; do not spend effort chasing org-level templates unless the user mentions one.

### 4. Build the PR body

**If a template was found:** use it as the body structure.

- Keep every heading, in the original order and with the original wording. Teams and automations rely on them.
- Replace placeholders (`[...]`, `...`, `fixes #1234`, example steps) with real content. Never leave example text behind.
- Treat italic or HTML-comment guidance (`_Describe the changes..._`, `<!-- ... -->`) as instructions to _you_: follow it, then remove the guidance text, since reviewers don't need to read the prompt.
- Keep fixed boilerplate that isn't a placeholder (for example a "begin with a DRAFT PR" instruction block). When in doubt, keep it.
- If a section doesn't apply, write `N/A` plus a few words on why. Don't delete the section.
- Add nothing the template doesn't ask for, with one exception: if the diff carries real risk (migration, breaking change, config change) and the template has no obvious place for it, add it under the closest "Additional Information"-style section.
- Fill checklists per [Checklist honesty](#checklist-honesty).

**If no template was found:** use the fallback below.

#### Fallback template

```markdown
## Summary

[1–3 sentences: what this PR does and why it is needed.]

Closes #[issue-number] <!-- or: Relates to PROJ-123 -->

## Changes

- [Behavioral or structural change, described at the level of intent, not file names]
- [...]

## How to Test

1. [Setup or precondition, e.g. branch, env var, seed data]
2. [Action: command, endpoint plus payload, or UI path]
3. Verify that [expected result].

**Automated tests:** [Tests added or updated. State which suites you ran and the result.]

## Screenshots / Evidence

[Before/after screenshots, logs, or response samples for UI or behavior changes. Otherwise: N/A.]

## Risk and Rollout

- **Impact:** [What parts of the system or which users are affected]
- **Breaking changes:** [None / describe, including API or contract changes]
- **Migrations, config, infra:** [None / DB migrations, new env vars or secrets, IaC or IAM changes, feature flags, deploy ordering]
- **Rollback:** [How to revert safely, or "Revert this PR"]

## Notes for Reviewers

- **Focus on:** [Where you want the closest review: tricky logic, design decision, security-sensitive code]
- **Out of scope / follow-ups:** [Known gaps, deferred work, tickets to be filed]

## Checklist

- [ ] Self-review of the diff completed
- [ ] Tests added or updated for the changes
- [ ] Lint, type-check, and build pass
- [ ] Documentation updated as needed (README, /docs, JSDoc, API specs)
- [ ] No secrets, credentials, or leftover debug code
```

How to fill the fallback well:

| Section                    | Guidance                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Summary**                | Lead with the _why_. A reviewer who reads only this should know the purpose.                                                                                                                                                    |
| **Changes**                | Describe behavior and design, not a file-by-file diff narration. Call out incidental or refactoring changes separately so reviewers don't mistake them for functional ones.                                                     |
| **How to Test**            | Concrete, runnable steps derived from the actual change (commands, endpoints with payloads, UI paths, expected output). Never invent steps for code paths you didn't read.                                                      |
| **Screenshots / Evidence** | Include only when it helps. You usually can't capture screenshots yourself; leave a clear `TODO: author to add before/after screenshots` and mention it in your final report.                                                   |
| **Risk and Rollout**       | The section that most often prevents incidents. Be explicit even when the answer is "None". For trivial PRs (typo, docs-only, comment changes), drop this section and Screenshots entirely rather than filling them with `N/A`. |
| **Notes for Reviewers**    | Direct attention. Say where the risky or debatable parts are, and what you deliberately did not do.                                                                                                                             |
| **Checklist**              | Subject to the honesty rules below. Add repo-specific items if `CONTRIBUTING.md` or CI config implies them (changelog entry, OpenAPI regeneration, etc.).                                                                       |

### 5. Write the title

Match the repository's existing convention first. Detect it:

```bash
gh pr list --state merged --limit 10 --json title -q '.[].title'
git log --oneline -15 <base>
```

Also check `CONTRIBUTING.md`, `commitlint.config.*`, and any `.github/workflows` that lint PR titles (e.g. `semantic-pull-request`).

**If the repo uses Conventional Commits** (or a title-linting workflow), use `type(scope): description`:

- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Mark breaking changes with `!` after the type or scope: `feat(api)!: remove v1 endpoints`
- This matters most with squash-merge, where the PR title becomes the commit on the default branch and may drive changelog and version automation.

**If the repo uses a ticket prefix**, follow it exactly (e.g. `PROJ-123: Add retry to order sync`). Take the key from the branch name (`feature/PROJ-123-order-retry`) or the user's prompt.

**If no convention is detectable**, write a plain imperative title. Optionally prefix the ticket key if one is known.

Rules for every title:

- **Imperative mood**: "Add", "Fix", "Remove", not "Added" or "Adds".
- **About 50–72 characters.** Specific enough to be useful in a list of 30 PRs.
- **Describe the outcome or behavior**, not the mechanism or the activity. Not "Update files" or "Fixes", not "Changes to OrderService.ts".
- **No trailing period.** No emoji unless the repo's history uses them.
- **No `WIP` or `[DRAFT]` in the title.** Draft status is the PR's state, not part of its name.

Examples:

| Weak                                               | Better                                                          |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `Updates`                                          | `fix(orders): prevent duplicate charge on payment retry`        |
| `PROJ-123 changes to auth`                         | `PROJ-123: Reject expired refresh tokens in session middleware` |
| `Refactored the user service and also fixed a bug` | Split into two PRs, or lead with the primary change             |

### 6. Push and create the draft PR

1. Ensure the branch is on the remote. Push only the current feature branch:
   ```bash
   git push -u origin HEAD
   ```
   Never force-push, and never push to the default branch. If the push would require `--force`, stop and ask.
2. Write the body to a temporary file and pass it with `--body-file`. This avoids shell quoting and escaping bugs with backticks, quotes, and newlines in Markdown.
3. Create the PR as a **draft**:
   ```bash
   gh pr create --draft --base <base> --title "<title>" --body-file <path-to-body.md>
   ```
4. Don't add labels, reviewers, assignees, or milestones unless the user, the template, or `CONTRIBUTING.md` asks for them. `CODEOWNERS` already requests reviewers automatically.
5. If `gh` is missing or unauthenticated, don't improvise with raw API calls. Output the final title and body for the user to paste, and give them the compare URL (`https://github.com/<owner>/<repo>/compare/<base>...<branch>`). For GitLab, use `glab mr create --draft` with the same principles.

Delete the temporary body file afterwards.

### 7. Report back

Reply with:

- The PR URL and its state (**Draft**)
- The base branch and the title used
- Whether a repo template or the fallback was used
- **What remains before it should be marked ready**: unchecked checklist items, screenshots to add, CI results to wait for, open questions

Marking a draft ready (`gh pr ready`) is a deliberate step by the author. Do it only if the user explicitly asks. Offer it once the checklist is complete and CI is green.

## Why draft by default

A draft PR lets the author confirm CI passes, finish the checklist, and re-read their own diff before reviewers get notified. It also signals "not ready for review" to teammates and keeps code owners from being pinged early. Opening as ready should be the exception, used only when the user clearly requests it ("open it ready for review", "not a draft").

## Checklist honesty

Checklist boxes are statements of fact from the PR author. Check a box only if you verified it in this session.

- ✅ Check "self-review of changes" only after you've actually read the full diff (step 2).
- ✅ Check "tests added or updated" only if the diff includes test changes.
- ✅ Check "lint/build passes" or "tests pass" only if you ran them and saw them pass. Report the command you ran.
- ❌ Leave unchecked anything you couldn't verify or that needs a human (manual QA, product sign-off, docs review, screenshots). Mention each one in your final report.
- Never invent verification: no fabricated test output, no "tested locally" without having tested.

## Content rules

- **Why over what.** The diff already shows what changed; the description must supply context the diff can't.
- **Link issues properly.** Use a closing keyword (`Closes #123`, `Fixes #123`) only when merging fully resolves the issue; otherwise use `Relates to #123`. For Jira, include the key (`PROJ-123`) in the title or body so the integration links it.
- **No secrets or internal-only data.** Don't paste tokens, credentials, customer data, or internal hostnames into the PR body.
- **Be proportionate.** A one-line typo fix needs a one-line description. Don't pad.
- **Be honest about gaps.** Unfinished work, known limitations, and skipped tests belong in _Notes for Reviewers_, not hidden.
