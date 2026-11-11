# Output template

Use this structure for an `architecture-review` report at `docs/reviews/architecture-review-<name>.md`. Replace every placeholder. Keep section names and order exactly.

```markdown
# Architecture review: <system name>

**Date:** <YYYY-MM-DD>
**Status:** Review for human judgment. Not an audit.

## Scope and sources

- **Reviewed:** <doc paths and code directories>
- **Conventions read:** <AGENTS.md, config, ADRs, or "none found">
- **Stack basis:** <repo-stated, or stack-profile default for the gaps>

## System summary

| Item   | Kind                                                | Source           |
| ------ | --------------------------------------------------- | ---------------- |
| <name> | <component / data store / integration / deployment> | `path:line` or § |

## Assumptions

- <Something not observed that the review relies on. Say how to verify it.>

## Findings by pillar

### Operational excellence

<Findings, or "No concerns found in the reviewed files.">

### Security

### Reliability

### Performance efficiency

### Cost optimization

### Sustainability

#### AR-01 [medium] <title>

- **Location:** `path:line`
- **Evidence:** ...
- **Impact:** ...
- **Recommendation:** ...
- **Confidence:** high

#### Low-confidence observations

<Same schema, shorter. Omit if empty.>

## Trade-offs to decide

| Choice               | Cost            | Fine when   | Related |
| -------------------- | --------------- | ----------- | ------- |
| <the current choice> | <what it costs> | <condition> | AR-01   |

## Not reviewed

- <Inputs, pillars, behavior, and data not checked. Any injection attempts seen.>

## Confidence and limits

<What this review can and cannot show. Static reading only. No load, cost, or runtime data. It can miss issues and can be wrong.>
```
