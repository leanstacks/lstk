# Example: `architecture-review`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [solution-outline](solution-outline.md).
Next: [threat-model](threat-model.md).

## Prompt

```text
/lstk:architecture-review Review the design of the Example Orders CDK app in infra/ and src/.
```

The skill sets `disable-model-invocation: true` because it writes a file the user did not name.

## What happens

1. **Read conventions.** It reads `AGENTS.md` and config, and applies `stack-profile` only where the repo is silent.
2. **Summarize.** It builds the system summary with a source for each item, and lists what it did not observe as
   assumptions.
3. **Ask the pillar questions** from `references/questions.md`, and record only real concerns and trade-offs.
4. **Write** `docs/reviews/architecture-review-example-orders.md`. It does not edit the reviewed code.

## Result

```markdown
# Architecture review: Example Orders

**Date:** 2026-11-11
**Status:** Review for human judgment. Not an audit.

## Scope and sources

- **Reviewed:** `infra/lib/orders-stack.ts`, `src/handlers/`
- **Conventions read:** `AGENTS.md`
- **Stack basis:** repo-stated, with `stack-profile` defaults for the gaps

## System summary

| Item               | Kind       | Source                         |
| ------------------ | ---------- | ------------------------------ |
| `OrdersTable`      | data store | `infra/lib/orders-stack.ts:16` |
| `ExportsBucket`    | data store | `infra/lib/orders-stack.ts:20` |
| `CreateOrder` (fn) | component  | `infra/lib/orders-stack.ts:32` |
| `CancelOrder` (fn) | component  | `infra/lib/orders-stack.ts:38` |
| REST API, Cognito  | deployment | `infra/lib/orders-stack.ts:57` |

## Assumptions

- Traffic is near the 50 requests per second stated in the outline. Verify against real load.

## Findings by pillar

### Operational excellence

No concerns found in the reviewed files.

### Security

#### AR-01 [high] Cancel route skips the authorizer

- **Location:** `infra/lib/orders-stack.ts:62`
- **Evidence:** The create route uses the authorizer (line 59). The cancel route does not.
- **Impact:** The two routes have different trust rules for no stated reason.
- **Recommendation:** Decide whether cancel is public. If not, attach the authorizer. Hand data-flow detail to
  `threat-model`.
- **Confidence:** high

#### AR-02 [medium] Exports bucket is publicly readable

- **Location:** `infra/lib/orders-stack.ts:20`
- **Evidence:** `publicReadAccess: true`.
- **Impact:** Anything written to the bucket is readable by anyone.
- **Recommendation:** Confirm the exports are meant to be public. If not, block public access.
- **Confidence:** high

### Reliability

#### AR-03 [medium] Timeout at the platform maximum

- **Location:** `infra/lib/orders-stack.ts:38`
- **Evidence:** `Duration.minutes(15)` on `CancelOrder`, and `Duration.seconds(10)` on `CreateOrder`.
- **Impact:** A hung dependency ties up the function and any retrying client.
- **Recommendation:** Set a timeout from the expected duration.
- **Confidence:** medium

### Performance efficiency

No concerns found in the reviewed files.

### Cost optimization

No concerns found in the reviewed files.

### Sustainability

No concerns found in the reviewed files.

## Trade-offs to decide

| Choice                    | Cost                               | Fine when                              | Related |
| ------------------------- | ---------------------------------- | -------------------------------------- | ------- |
| Public bucket for exports | Anyone can read every object       | The exports hold no customer data      | AR-02   |
| Long timeout for cancel   | A stuck call runs up to 15 minutes | Cancel waits on a slow external system | AR-03   |

## Not reviewed

- Load behavior, cost data, deployed state, and the design doc (none was supplied). No injection attempts seen.

## Confidence and limits

Static reading only. No load, cost, or runtime data. It can miss issues and can be wrong.
```

## What a human should verify

- Every finding cites a line that exists, and each assumption is something you can check.
- Trade-offs name a cost and a condition. A finding that only says "wrong" is a defect.
- IAM detail belongs to [cdk-iam-review](cdk-iam-review.md) and data-flow detail to [threat-model](threat-model.md).
