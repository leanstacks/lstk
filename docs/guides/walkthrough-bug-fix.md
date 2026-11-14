# Walkthrough: a bug fix, reviewed and committed

An annotated, trimmed record of one real run of the [fix a bug](existing-projects.md#fix-a-bug) recipe on the Example Orders fixture. Use it to see what each step returns before you try it.

> Recorded on 2026-11-13 with `lstk` 0.4.0 and Claude Code 2.1.325, in headless mode (`claude -p`), on `tests/fixtures/sample-repo`. Output is trimmed, and the wording of your run will differ. The pull request step is not shown, because the scratch repo had no remote. See [existing projects](existing-projects.md#shared-implementation-loop) for it.

**The bug.** The cancel route skips the Cognito authorizer that `AGENTS.md` requires. The fix is one line in `infra/lib/orders-stack.ts`: pass `{ authorizer }` to the cancel route, as the create route does.

## Step 1: review the diff `[delegate it]`

```text
Run git diff main...HEAD, then delegate the diff to the lstk:code-reviewer agent. Intent: require the Cognito authorizer on the cancel-order route, per AGENTS.md. Check my changes for test gaps. Show me its report as it is, and do not fix anything yet.
```

Claude ran the git command itself and passed the diff to the agent, which has no shell. The agent's report followed its fixed shape. Trimmed:

```text
## Summary
The authorizer is now attached to the cancel route, which matches the intent. The change has no test, and
tests/cancel-order.test.ts does not exist, which breaks an AGENTS.md rule.

### CR-01 [medium] No test for cancel-order handler or for the authorizer requirement
- Location: tests/ (missing tests/cancel-order.test.ts); infra/lib/orders-stack.ts:62
- Impact: Someone can remove { authorizer } again and nothing fails.
- Recommendation: Add a CDK assertions test that checks the cancel method has an authorizer.
- Confidence: high

## Test gaps
- tests/cancel-order.test.ts is missing, so the handler has no test.
- No infra test exists for route authorization.

## Not reviewed
- No deploy-time or synth behavior was run, because I have no shell.
```

**What to notice.** The reviewer found the missing test, which is the gap the repo's own rule names. It also routed the out-of-scope security findings (the hardcoded key and the wildcard IAM) to `threat-model` and `cdk-iam-review`, and fixed nothing. A reviewer that never edits is what lets you decide what to act on.

## Step 2: commit `[say it]`

```text
Commit the staged changes with the commit-messages skill.
```

The skill read the repo, found no convention in `AGENTS.md` or the history, and used its four-prefix format. Because the change fixes a defect, it chose `fix`:

```text
fix: require the Cognito authorizer on the cancel order route
```

**What to notice.** Your own commit convention wins when the repo has one. In this run the commit waited for approval, which is the normal permission prompt.

## What lstk added, and what it did not

lstk supplied the review, the commit message, and the pull request. Finding the cause and writing the one-line fix were plain Claude Code. The review's main value here was the test gap, which you would add as a follow-up step in the loop and review again.
