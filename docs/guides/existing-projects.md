# Existing projects

Recipes for changing a codebase that already exists.

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

Every recipe here runs the [shared implementation loop](#shared-implementation-loop) and adds a few steps at the front
or the back. Read the loop first. lstk has **no skill for implementing, bug fixing, or test coverage**. Those steps are
plain Claude Code, made safer by the `lstk-guardrails` hooks and better grounded by `AGENTS.md`. The legend for the
step tags (`[type it]`, `[say it]`, `[delegate it]`, `[plain Claude Code]`) is in the
[lifecycle map](lifecycle.md#how-to-invoke-each-piece).

Example prompts use the fictional Example Orders system. Replace the names with your own.

## Shared implementation loop

**When to use it.** Any change to code you did not just write: a feature, an enhancement, a fix, or tests. The recipes
below all point back here.

**Steps.**

1. **Ground.** Make sure Claude knows your conventions. If the repo has no `AGENTS.md`, run `agents-md-author` first
   (see the note at the end of this section). If the repo is unfamiliar to you, run `repo-onboarding`. [say it]
2. **Plan.** Switch to plan mode (`Shift+Tab` until the status bar shows it, or start a prompt with `/plan`). Claude
   reads the code and proposes a plan. Edits stay blocked until you approve. [plain Claude Code]
3. **Implement.** Approve the plan, then work in small steps with the hooks on. Ask for one step at a time and read each
   diff. [plain Claude Code]
4. **Check.** Run `npm run check`, or your repo's equivalent (lint, format, tests). [plain Claude Code]
5. **Review.** Delegate the diff to `code-reviewer`. [delegate it]
6. **Commit.** Ask for a commit with `commit-messages`. [say it]
7. **Pull request.** Open a draft PR with `create-pull-request`. [type it]

**Prompt.** One prompt per step. Replace the text in angle brackets.

```text
Step 1, only if the repo has no AGENTS.md:
Create an AGENTS.md for this repo with the agents-md-author skill.
```

```text
Step 1, only if the repo is unfamiliar:
Onboard me to this repo with the repo-onboarding skill. I am about to change <area>.
```

```text
Step 2, in plan mode:
Plan this change: <what and why>. Read the code that is involved first. List the files you expect to touch, the tests
you will add, and anything you are unsure about. Do not edit anything yet.
```

```text
Step 3:
Implement step 1 of the plan only. Stop when it works and tell me what you changed.
```

```text
Step 4:
Run npm run check and fix any failures that your change caused.
```

```text
Step 5:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: <what the change does and
why>. Show me its report as it is, and do not fix anything yet.
```

```text
Step 6:
Commit the staged changes with the commit-messages skill.
```

```text
Step 7:
/lstk:create-pull-request
```

**Produces.** Commits on your branch and a draft pull request. `code-reviewer` writes no file. Its report appears in
your session, so copy anything you want to keep into the PR description.

**Skip it when.**

- Step 1: the repo has a current `AGENTS.md` and you already know the area.
- Step 2: the change is one or two lines and you can describe the diff in a sentence.
- Step 5: the change is a typo or a comment. Review everything that touches logic, tests, or infrastructure.

**What lstk adds here.**

- `agents-md-author` and `repo-onboarding` ground Claude in the repo. They write `AGENTS.md` and
  `docs/PROJECT_OVERVIEW.md`, both worth committing.
- `code-reviewer` checks correctness, test gaps, maintainability, and drift from the repo's stated conventions. It is
  read-only and never fixes code. Its report ends with a "Not reviewed" section. Read it, because it states what the
  review did not cover.
- `commit-messages` follows your repo's convention and falls back to `feat`, `fix`, `chore`, and `doc`.
- `create-pull-request` uses your repo's PR template and opens a draft.
- `lstk-guardrails` hooks block edits to protected files such as `.env` and lockfiles, and CDK `deploy`, `destroy`, and
  `watch`. If one blocks a call, ask Claude what was blocked and why, then decide as a human. Never turn the hook off.
  See the [guardrail model](../../README.md#guardrail-model).

**What is plain Claude Code here.** Planning, implementing, running checks, and fixing review findings. `code-reviewer`
only reports. You ask Claude to fix a finding in the main session.

**Example.** A review report in the format to expect: [code-reviewer example](../examples/code-reviewer.md).

**If the repo has no `AGENTS.md`.** Run `agents-md-author` before anything else. Until it exists, Claude falls back to
the `stack-profile` defaults (TypeScript ESM, NestJS, Lambda, Vite and React, CDK, Vitest, oxlint, Prettier). The repo
always wins over those defaults. When `AGENTS.md` and your config state a convention, Claude follows them, and
`code-reviewer` reviews against them.

## Add a feature

**When to use it.** You are adding behavior to an existing codebase. This recipe covers a small feature (use the loop
as it is) and a larger one (design first).

**Steps.**

1. **Decide the size.** A feature that touches one module, adds no new service, and needs no new decision is small. Go
   to step 5. [plain Claude Code]
2. **Outline the larger feature.** Run `solution-outline` with the requirements. It returns a draft outline: components,
   a diagram, key decisions, and risks. Treat it as input to a human review. [say it]
3. **Record each real decision.** For a choice between options, run `tech-eval`, then `adr-author` for the decision you
   take. [say it]
4. **Check the trust boundaries.** If the feature adds an endpoint, a new data store, a new caller, or an IAM change,
   run `threat-model` on the design. [type it]
5. **Run the loop.** Follow the [shared implementation loop](#shared-implementation-loop) from step 2, using the outline
   as the input to the plan. [plain Claude Code]

**Prompt.**

```text
Step 2:
Outline a solution for this feature with the solution-outline skill. Requirements: <requirements>. Constraints:
<existing services, deadlines, team size>. Read the repo first so the outline fits what is already built.
```

```text
Step 3:
Compare <option A> and <option B> for <decision> with the tech-eval skill.
```

```text
Step 3, after you choose:
Write an ADR for the decision to use <option>. Reasons: <why>.
```

```text
Step 4:
/lstk:threat-model
```

Then name the design doc or the code to model when it asks.

```text
Step 5, in plan mode:
Plan the feature from docs/design/<name>.md. Split it into steps that each leave the tests passing.
```

**Produces.** Nothing for a small feature beyond the loop's commits and PR. A larger feature adds files you commit:
`docs/design/<name>.md` (only when you ask for it, and mark it as a draft until a human reviews it),
`docs/adr/NNNN-<title>.md`, and `docs/threat-models/<name>.md` (a team choice, usually yes).

**Skip it when.**

- Steps 2 and 3: the feature is small and every decision already has a precedent in the repo.
- Step 4: the feature adds no trust boundary.

**Where to stop and ask a human.** Stop before implementing when the outline's key decisions are unresolved, when the
feature changes a public contract, or when `threat-model` returns a high-severity finding. These are people decisions.

**What lstk adds here.** `solution-outline` turns requirements into a reviewable draft. `tech-eval` compares options
with sources. `adr-author` records the decision in your repo's ADR convention. `threat-model` finds trust-boundary
risks in the design. The loop adds `code-reviewer`, `commit-messages`, and `create-pull-request`.

**What is plain Claude Code here.** Planning in plan mode and all of the implementation.

**Example.** [solution-outline](../examples/solution-outline.md), [tech-eval](../examples/tech-eval.md),
[adr-author](../examples/adr-author.md), and [threat-model](../examples/threat-model.md).

## Enhance an existing feature

**When to use it.** You are changing how a feature behaves, or extending it, and a regression is the main risk.

**Steps.**

1. **Understand the current behavior.** Run `repo-onboarding` if the area is unfamiliar, then ask Claude to read the
   code and explain what the feature does today. [say it]
2. **Pin the behavior.** Ask Claude to write characterization tests that capture what the code does now, including
   quirks. Run them and confirm they pass before any change. [plain Claude Code]
3. **Run the loop.** Follow the [shared implementation loop](#shared-implementation-loop) from step 2. Change the tests
   that must change, and explain each one in the commit. [plain Claude Code]
4. **Read the drift check.** In the `code-reviewer` report, look at the convention-drift findings. An enhancement is
   where new code most often stops matching the code around it. [delegate it]

**Prompt.**

```text
Step 1:
Explain how <feature> works today. Read the code and its tests. List the inputs, the outputs, and any behavior that
looks accidental. Do not edit anything.
```

```text
Step 2:
Write characterization tests for <feature> that record its current behavior, quirks included. Do not change any
production code. Run them and show me the result.
```

```text
Step 4:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: <the enhancement>. The
existing behavior of <feature> must not change except for <what you meant to change>. Report convention drift and any
behavior change that is not covered by a test.
```

**Produces.** The characterization tests, which you commit in their own commit before the change. Optionally
`docs/PROJECT_OVERVIEW.md` from `repo-onboarding`, a team document you commit.

**Skip it when.**

- Step 2: the feature already has tests that pin the behavior you are about to change. Read them instead.
- Step 1: you wrote the feature recently.

**What lstk adds here.** `repo-onboarding` for the first look. `code-reviewer` for the drift and test-gap check. The
loop's commit and PR skills.

**What is plain Claude Code here.** Reading the code, writing characterization tests, and making the change.

**Example.** [code-reviewer example](../examples/code-reviewer.md) shows the report, including the convention and test
gap sections.

## Fix a bug

**When to use it.** Something is broken and you know how to trigger it.

**Steps.**

1. **Reproduce with a failing test.** Ask Claude to write a test that fails for the reported reason. Run it and
   confirm it fails. [plain Claude Code]
2. **Find the cause.** Ask Claude to explain why the test fails before it changes anything. Use plan mode for anything
   that is not obvious. [plain Claude Code]
3. **Fix.** Make the smallest change that passes the test. Run `npm run check`. [plain Claude Code]
4. **Review.** Delegate the diff to `code-reviewer`. [delegate it]
5. **Commit as a fix.** Ask for a commit with `commit-messages`. It picks `fix`. [say it]
6. **Pull request.** Open a draft PR with `create-pull-request`. Link the issue. [type it]
7. **Escalate if it is a security bug.** If the bug exposes data, bypasses auth, or widens IAM, run `threat-model` on
   the affected component, and `cdk-iam-review` if the cause is CDK IAM. [type it]

**Prompt.**

```text
Step 1:
Bug: <what happens>, expected <what should happen>. Write a failing test that reproduces it. Do not fix it yet. Run
the test and show me that it fails for the right reason.
```

```text
Step 2, in plan mode:
Explain why the test fails. Name the line and the cause. Propose the smallest fix and any other code that shares the
cause.
```

```text
Step 4:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: fix <bug>. The new test
reproduces it. Check that the fix is minimal and that nothing else changed behavior.
```

```text
Step 6:
/lstk:create-pull-request
```

**Produces.** A failing-then-passing test and the fix, in one `fix` commit, and a draft PR. A security escalation
adds `docs/threat-models/<name>.md` (a team choice).

**Skip it when.**

- Step 1: the bug cannot be tested in code, for example a deployment or a data issue. Say so in the PR.
- Step 4: the fix is a one-line change with a test.

**What lstk adds here.** The review, commit, and PR steps. `commit-messages` chooses the `fix` prefix from the intent.
`threat-model` and `cdk-iam-review` cover the security case.

**What is plain Claude Code here.** All of the diagnosis, the test, and the fix. lstk has no debugging skill. Treat
the diagnosis as Claude's reasoning to verify, not as a finding. The failing test is what proves it.

**Example.** [code-reviewer example](../examples/code-reviewer.md), and [threat-model](../examples/threat-model.md)
for the escalation.

## Improve test coverage

**When to use it.** You want tests for behavior that has none. Coverage is a signal here, not the goal. A test that
cannot fail adds nothing.

**Steps.**

1. **Find the untested behavior.** Run the repo's coverage command and give Claude the output. Ask which untested
   behavior matters most, and why. [plain Claude Code]
2. **Write the tests.** Ask for tests of behavior, not of lines. Each test must be able to fail. [plain Claude Code]
3. **Check.** Run `npm run check` and the coverage command again. [plain Claude Code]
4. **Review for test gaps.** Delegate the diff to `code-reviewer` with the test-gap prompt. [delegate it]
5. **Commit.** Ask for a commit with `commit-messages`. [say it]
6. **Pull request.** Open a draft PR with `create-pull-request`. [type it]

**Prompt.**

```text
Step 1:
Here is the coverage output: <paste>. Which untested behavior carries the most risk? Rank the top five and say why.
Do not write tests yet.
```

```text
Step 2:
Write tests for the top two. Test behavior through the public interface. Make sure each test can fail: show me what
break each one would catch.
```

```text
Step 4:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: add tests for <behavior>.
Check my changes for test gaps, and for assertions that cannot fail.
```

**Produces.** Tests and a draft PR. `code-reviewer` writes no file.

**Commit prefix.** `commit-messages` follows the repo's convention. In the fallback format there is no `test` prefix.
Tests that come with a feature or fix go in that commit. A tests-only change is a `chore`. If the work also changes
behavior, split it.

**Skip it when.**

- Step 4: you only added tests, they pass, and they follow the patterns already in the repo. Run it when the tests are
  new in style or touch shared helpers.

**What lstk adds here.** `code-reviewer` checks for test gaps and assertions that cannot fail. `commit-messages` and
`create-pull-request` finish the loop.

**What is plain Claude Code here.** Reading coverage output, choosing what to test, and writing the tests. lstk has no
test-generation skill.

**Example.** The "Test gaps" section of the [code-reviewer example](../examples/code-reviewer.md).
