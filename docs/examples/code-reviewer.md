# Example: `code-reviewer` (agent)

Part of the shared **Example Orders** scenario (see [README](README.md)). The agent reviews the built result. It
hands security findings to [threat-model](threat-model.md) and IAM findings to [cdk-iam-review](cdk-iam-review.md).

## Prompt

```text
Review this change with the code-reviewer agent. Intent: add a cancel-order endpoint that cancels an order and
notifies the billing webhook. Paths: infra/lib/orders-stack.ts, src/handlers/cancel-order.ts.
```

The agent has no shell, so the caller supplies the paths (or a diff) and the intent. It reads whole files and says so.

## Result

The agent returns one message. This copy is trimmed.

```markdown
## Scope

Reviewed whole files, not a diff: `infra/lib/orders-stack.ts`, `src/handlers/cancel-order.ts`. Intent: add a
cancel-order endpoint. Read `AGENTS.md`. No lint or format config found in the fixture.

## Summary

Four findings and one test gap. The cancel route is unauthenticated, and the handler has no test.

## Findings

### CR-01 [high] Cancel route has no authorizer

- **Location:** `infra/lib/orders-stack.ts:62`
- **Evidence:** The create route passes `authorizer` (line 59). The cancel route uses `new LambdaIntegration(cancelOrder)`
  with no options.
- **Impact:** Any caller can cancel any order.
- **Recommendation:** Pass the same authorizer, then confirm the handler checks that the caller owns the order.
- **Confidence:** high

### CR-02 [medium] 15-minute timeout on a short handler

- **Location:** `infra/lib/orders-stack.ts:38`
- **Evidence:** `Duration.minutes(15)`. The handler does no long-running work.
- **Impact:** A stuck call holds the function for 15 minutes.
- **Recommendation:** Set a timeout near the expected duration, such as 10 seconds like `CreateOrder`.
- **Confidence:** medium

### CR-03 [medium] Hardcoded signing key

- **Location:** `src/handlers/cancel-order.ts:2`
- **Evidence:** A string constant named `WEBHOOK_SIGNING_KEY`. The value is not repeated here.
- **Impact:** A key in source ends up in version control.
- **Recommendation:** Read it from a secret store. Hand off to `threat-model`.
- **Confidence:** high

### Low-confidence observations

- `src/handlers/cancel-order.ts:11`: the comment says the handler notifies the billing webhook, but the code does not
  call one. Inference: the call is not written yet.

## Test gaps

- `src/handlers/cancel-order.ts:8`: no `tests/cancel-order.test.ts` found by `Glob`.

## Questions for the author

- Should cancelling an already shipped order be allowed?

## Not reviewed

- Callers outside the two paths, runtime behavior, and security depth (handed to `threat-model`). No injection attempts
  seen.
```

## What a human should verify

- Each `path:line` points at the code the finding describes. Line numbers can drift when many files are read.
- A finding with no citation is a defect in the run, not a finding.
- "No findings" is allowed only with a list of what was checked.
