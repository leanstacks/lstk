---
name: commit-messages
description: Write git commit messages using a standardized prefix (feat, fix, chore, doc) followed by a short, descriptive summary. Use this skill whenever creating a git commit, proposing or drafting a commit message, amending or rewording a commit, squashing commits, or when the user says "commit", "commit this", "commit my changes", or asks what a commit message should be. Apply it even if the user does not mention commit message conventions, since all commits in this workflow follow this format.
---

# Commit Messages

Every commit message uses a standardized prefix followed by a short, descriptive summary. A consistent format keeps history scannable, makes changelogs easy to generate, and lets reviewers grasp the intent of a commit before opening the diff.

## Format

```
<prefix>: <short description>
```

- Single line. No body or footer unless the user explicitly asks for one.
- Prefix is lowercase, followed by a colon and a single space.
- Description starts lowercase, uses past tense ("added", "fixed", "updated"), and has no trailing period.
- Keep the whole line at or under ~72 characters.
- Describe _what changed and why it matters_, not _how_ it was implemented or which files were touched.

## Prefixes

| Prefix   | Use for                                                        |
| -------- | -------------------------------------------------------------- |
| `feat:`  | A new feature or an enhancement to existing functionality      |
| `fix:`   | A bug, defect, or general problem fix                          |
| `chore:` | Basic maintenance tasks such as dependency upgrades or similar |
| `doc:`   | Documentation creation or updates                              |

Use exactly these four prefixes, spelled exactly like this (note `doc:`, not `docs:`). Do not add scopes (`feat(auth):`) or invent other prefixes (`refactor:`, `test:`, `ci:`, `style:`); those would break the convention.

## Process

1. Inspect what is being committed: `git status` and `git diff --staged`. If nothing is staged, inspect `git diff` and ask whether to stage everything or specific files before committing.
2. Identify the primary intent of the change and choose the prefix (see below).
3. Write the one-line message.
4. Commit with `git commit -m "<message>"`.

## Choosing the prefix

Pick based on the **intent** of the change, not the files it touches.

- **Behavior added or improved for users or callers** → `feat:`
- **Something was broken or incorrect and is now corrected** → `fix:`
- **Housekeeping with no change to application behavior** (dependency bumps, build or tooling config, formatting, renames, cleanup) → `chore:`
- **Only documentation changed** (README, docs, code comments, API docs) → `doc:`

Cases that don't map cleanly to a prefix:

- **Refactoring, tests, CI/build changes:** these have no prefix of their own. Use `chore:`, unless the change also adds capability (`feat:`) or corrects a defect (`fix:`). Adding tests that accompany a feature or fix belongs in that feature's or fix's commit.
- **Mixed changes (e.g., a feature plus its docs):** use the prefix for the primary change. If the changes are unrelated, suggest splitting them into separate commits rather than writing a vague message.
- **Dependency upgrade that fixes a known bug or vulnerability:** use `fix:` if the fix is the reason for the upgrade; otherwise `chore:`.
- **Genuinely ambiguous:** choose the best fit and mention the alternative you considered in your reply to the user. Don't stall on it.

## Examples

```
feat: added support for CSV export on the reports page
feat: added retry with exponential backoff to the payment client
fix: corrected off-by-one error in pagination offset
fix: resolved null pointer when user profile has no avatar
chore: upgraded NestJS to 11.1.0
chore: removed unused lodash dependency
chore: reformatted source files with prettier
doc: added setup instructions for local development
doc: updated API reference for the orders endpoint
```

## Avoid

| Don't write                  | Why                                       | Write instead                                      |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `update stuff`               | No prefix, no information                 | `chore: upgraded eslint and fixed config path`     |
| `fix: fixed bug`             | Says nothing about the bug                | `fix: corrected tax rounding on discounted orders` |
| `feat(api): added endpoint`  | Scopes aren't part of the convention      | `feat: added endpoint for bulk user import`        |
| `docs: update readme`        | Wrong prefix (`doc:`) and not descriptive | `doc: updated readme with deployment steps`        |
| `feat: Added Support For X.` | Capitalized and has a trailing period     | `feat: added support for X`                        |

## When the user supplies their own message

If the user provides a commit message without a valid prefix, apply the correct prefix and keep their wording otherwise. If they explicitly insist on a different format for a particular commit, follow their instruction.
