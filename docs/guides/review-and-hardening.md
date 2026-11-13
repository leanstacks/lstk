# Review and hardening

Recipes for reviewing changes and designs and hardening a service.

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

All of these are reviews. They read code and docs and report what they found. None of them edits your code, runs your
app, or deploys anything. None certifies that a change, design, or service is correct, secure, or compliant. Each
report ends with a "Not reviewed" section and a limits note. Read both.

The legend for the step tags (`[type it]`, `[say it]`, `[delegate it]`, `[plain Claude Code]`) is in the
[lifecycle map](lifecycle.md#how-to-invoke-each-piece). Example prompts use the fictional Example Orders system.
Replace the names with your own.

Review skills that write a file put it under `docs/reviews/` or `docs/threat-models/`. Whether to commit a review is a
team choice. A review is a record of what was checked on one day, so commit it when you want that record and ignore it
when you do not.

## Review a change

**When to use it.** You have a diff on a branch and want a second read before you commit or open a pull request. This
is step 5 of the [shared implementation loop](existing-projects.md#shared-implementation-loop).

**Steps.**

1. **Get the diff and the intent.** The agent has no shell and does not see your conversation, so it only knows what
   you put in the prompt. Write one or two sentences on what the change does and why. [plain Claude Code]
2. **Delegate the review.** Ask Claude to run the diff and hand it to `code-reviewer`. For a guaranteed hand-off, name
   the agent as `@agent-lstk:code-reviewer`. [delegate it]
3. **Read the report.** Work through it in the order below. [plain Claude Code]
4. **Act on the findings.** Ask Claude, in the main session, to fix the ones you accept. Run your checks again, and
   review again if the fix was large. [plain Claude Code]

**Prompt.**

```text
Step 2:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: <what the change does and
why>. Show me its report as it is, and do not fix anything yet.
```

```text
Step 2, when you want test gaps in particular:
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: <...>. Check my changes for
test gaps. Show me its report as it is, and do not fix anything yet.
```

```text
Step 4:
Fix CR-01 and CR-03 from the review. Leave the rest. Then run npm run check.
```

**How to read the report.** It has a fixed shape: Scope, Summary, Findings, Test gaps, Questions for the author, and
Not reviewed.

- **Scope** says what was reviewed and which convention files (`AGENTS.md`, lint config) it found. If it says it
  reviewed whole files and not a diff, you passed paths and not a diff.
- **Findings** are ordered by severity (`high`, `medium`, `low`, `info`), each with a `path:line` citation. Check the
  citation before you act. A finding is a claim from a read of the code, so confirm the high ones yourself.
- **Low-confidence observations** are guesses the agent marked as such. Skim them. Do not treat them as defects.
- **Test gaps** name changed behavior with no test. Coverage is a signal, not the goal.
- **Questions for the author** are things the code cannot answer. Answer them, or add the answer as a comment or in the
  PR description.
- **Not reviewed** states what the review did not cover. A security-sensitive area listed here is a prompt to run
  `threat-model` or `cdk-iam-review`. The agent flags such a finding in one line and does not analyze it.

**Produces.** A report in your session, and no file. Copy anything you want to keep into the PR description.

**Skip it when.** The change is a typo or a comment. Review everything that touches logic, tests, or infrastructure.
A diff that is too large to read is too large to review: split it first.

**What lstk adds here.** `code-reviewer` is a read-only agent that reviews for correctness, test gaps,
maintainability, and drift from the conventions your repo states. It reviews against `AGENTS.md` and your lint config,
and falls back to the `stack-profile` defaults only where the repo is silent. It never fixes code.

**What is plain Claude Code here.** Producing the diff, writing the intent, and fixing the findings. The agent only
reports.

**Example.** [code-reviewer example](../examples/code-reviewer.md).

## Review a design

**When to use it.** You have a design doc, or a CDK and application codebase, and want to find weak points before you
build on it or ship it.

**Steps.**

1. **Choose the input.** Name a design doc path, a directory of CDK or application code, or both. If you give neither,
   the skill asks once and stops. [plain Claude Code]
2. **Run the review.** `architecture-review` is slash-only, so type it. It reads `AGENTS.md`, config, and any ADRs in
   `docs/adr/` first, and treats decisions recorded there as context, not findings. [type it]
3. **Decide the trade-offs.** The report returns trade-offs for you to decide, not verdicts. Each names the choice, what
   it costs, and the condition under which the current choice is fine. [plain Claude Code]
4. **Record each decision you take.** Run `adr-author` with the decision and your reasons. [say it]
5. **Hand off the specialist concerns.** The report names `threat-model` for data-flow and trust-boundary concerns and
   `cdk-iam-review` for IAM. Run them when it does. See [harden a service](#harden-a-service). [type it]

**Prompt.**

```text
Step 2:
/lstk:architecture-review
```

Then name the input when it asks, for example `docs/design/orders.md and infra/`.

```text
Step 4:
Write an ADR for the decision to <decision>. Reasons: <why>. This follows from trade-off <n> in
docs/reviews/architecture-review-orders.md.
```

**Produces.** `docs/reviews/architecture-review-<name>.md`, or the same content inline if you ask for that. Commit it
if you want the record. Decisions you take become `docs/adr/NNNN-<title>.md`, which you commit.

**Skip it when.** The design is a single technology choice (use `tech-eval`), or you want only IAM (use
`cdk-iam-review`) or only a threat analysis (use `threat-model`).

**What lstk adds here.** `architecture-review` works through six pillar areas (operational excellence, security,
reliability, performance efficiency, cost optimization, and sustainability). It cites a source for every finding,
and it separates fact from inference. It never says a design is sound, secure, or well-architected. `adr-author`
records what you decide.

**What is plain Claude Code here.** Deciding the trade-offs. The owner decides, and a review that has no owner for
its trade-offs changes nothing.

**Limits.** Static reading of the files you gave it. It does not see runtime behavior, load, cost data, or anything
outside the inputs, and it lists those under "Not reviewed".

**Example.** [architecture-review example](../examples/architecture-review.md) and
[adr-author example](../examples/adr-author.md).

## Harden a service

**When to use it.** You own a service and want a periodic pass on its security and resilience: before a major release,
after a big change, or on a schedule such as once a quarter. Run the steps in order, because each report feeds the next.

**Steps.**

1. **Model the threats.** Run `threat-model` on the code and infrastructure, or on the design doc. Read the "Top risks"
   and "Mitigation plan" sections first. [type it]
2. **Review the IAM.** If the service is an AWS CDK app in TypeScript, run `cdk-iam-review`. It lists every principal
   and flags over-broad grants. It shows diffs and never applies them. It covers CDK TypeScript only, and it stops on
   Terraform, CloudFormation, or CDK in another language. [type it]
3. **Review the architecture.** Run `architecture-review` for resilience, cost, and operations. [type it]
4. **Triage dependencies by hand.** Run `npm audit --json` yourself, then ask Claude to assess each advisory. See the
   prompt below. [plain Claude Code]
5. **Decide and record.** Turn the reports into a short list of changes you accept. Record each real decision with
   `adr-author`. [say it]
6. **Fix through the normal loop.** Each accepted change goes through the
   [shared implementation loop](existing-projects.md#shared-implementation-loop). Do not fix from inside a review.
   [plain Claude Code]

**Prompt.**

```text
Step 1:
/lstk:threat-model
```

Then name the system, for example `the orders API in src/ and infra/`.

```text
Step 2:
/lstk:cdk-iam-review
```

Then name the directory or stack, for example `infra/`.

```text
Step 3:
/lstk:architecture-review
```

Then name the design doc and the directory.

```text
Step 4, after you have run npm audit --json and saved the output to a file:
Read <path to the audit output>. For each advisory, check whether the vulnerable package or function is used in this
repo, whether it is a dev or a runtime dependency, and whether removing or upgrading is the lowest-risk fix. Report
what you found for each, and do not change anything yet.
```

**Why dependency triage is by hand.** lstk has no `dependency-audit` skill. It was considered and not built, because
it did not add enough over plain Claude Code reading `npm audit` output. Read what any automatic fix would change
before you apply it, and never run `npm audit fix --force` blind.

**Produces.** `docs/threat-models/<name>.md`, `docs/reviews/cdk-iam-review-<name>.md`, and
`docs/reviews/architecture-review-<name>.md`, each of which you can ask for inline instead. Commit them as the record
of the pass. The audit output is a working file, so do not commit it. ADRs go in `docs/adr/` and you commit them.

**Skip it when.**

- Step 2: the service is not a CDK TypeScript app.
- Step 3: you ran it recently and the design has not changed.
- The whole pass: the change is small. Use [review a change](#review-a-change) instead.

**What lstk adds here.** Three review skills that cite `path:line` for every finding, never print secrets (they
report only the location and the kind), and hand off to each other by name. `threat-model` draws the data flows with
trust boundaries and applies STRIDE. `cdk-iam-review` traces every grant to the principal it affects and also reads
`cdk.out/` templates and cdk-nag output when they exist. A clean cdk-nag report says nothing about least privilege.

**What is plain Claude Code here.** Dependency triage, the decision about what to accept, and every fix.

**Guardrails.** The hooks keep working during a hardening pass. They block CDK `deploy`, `destroy`, and `watch`, and
they block edits to protected files such as `.env` and lockfiles. If a call is blocked, ask Claude what was blocked and
why, then decide as a human. Never turn the hook off. The strongest guardrail is credentials: give the session a
read-only AWS identity. See the [guardrail model](../../README.md#guardrail-model).

**Examples.** [threat-model](../examples/threat-model.md), [cdk-iam-review](../examples/cdk-iam-review.md), and
[architecture-review](../examples/architecture-review.md).

## Before a release or client handoff

**When to use it.** You are about to release, or to hand a codebase to a client or another team, and want a short
checklist of what has and has not been looked at.

**Steps.** This recipe adds no new skill. Work through it and tick off each line. Skip a line that does not apply.

1. **Review the whole change.** Run [review a change](#review-a-change) on the full diff since the last release, or on
   each pull request not yet reviewed. Resolve every high finding. [delegate it]
2. **Run the checks.** Run `npm run check`, or your repo's equivalent, on a clean checkout. [plain Claude Code]
3. **Run the hardening pass if the trust surface changed.** If the release adds an endpoint, a data store, a caller, or
   an IAM change, run [harden a service](#harden-a-service). [type it]
4. **Check the records.** Confirm that decisions made since the last release have ADRs, and that `AGENTS.md`,
   `docs/PROJECT_OVERVIEW.md`, and `docs/LOCAL_SETUP.md` still match the code. Ask for a refresh with
   `agents-md-author`, `repo-onboarding`, and `local-setup-author` where they do not. For a handoff, a new owner needs
   these three most. [say it]
5. **Write down what was not covered.** Collect the "Not reviewed" and limits sections from each report, plus anything
   you chose not to fix. Put them in the release notes or the handoff doc, so the next person knows.
   [plain Claude Code]

**Prompt.**

```text
Step 4:
Check whether AGENTS.md, docs/PROJECT_OVERVIEW.md, and docs/LOCAL_SETUP.md still match the code. Use the
agents-md-author, repo-onboarding, and local-setup-author skills. Report what is stale before you change anything.
```

```text
Step 5:
Collect the "Not reviewed" and "Confidence and limits" sections from the reports in docs/reviews/ and
docs/threat-models/. List them as known limits for the release notes, and do not summarize away any of them.
```

**Produces.** Refreshed `AGENTS.md`, `docs/PROJECT_OVERVIEW.md`, and `docs/LOCAL_SETUP.md` (commit them), plus a known
limits list for your release notes.

**Skip it when.** The release is a one-line fix. The loop's review is enough.

**What lstk adds here.** The review, hardening, and documentation skills named above, and a consistent "Not reviewed"
section in every report, which makes step 5 a copy job.

**What is plain Claude Code here.** The checks, the sign-off, and the release itself. lstk does not deploy.

**The limits, stated once.** Every review here is a static read of files by a model. None of them is a penetration
test, a security audit, or a compliance statement. They can miss issues. For a regulated system or a client that
requires assurance, they are input to a qualified human review and not a replacement for one.
