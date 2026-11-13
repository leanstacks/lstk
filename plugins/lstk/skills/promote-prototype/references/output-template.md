# Output template

Use this structure for a `promote-prototype` report at `prototypes/<name>/PROMOTION-GAPS.md`. Replace every placeholder. Keep section names and order exactly. Never include a secret value. Never write "ready", "secure", "compliant", or "complete".

```markdown
# Promotion gaps: <prototype name>

**Date:** <YYYY-MM-DD>
**Status:** Gap list for human judgment. Not an audit, and not an estimate.

## Scope and sources

- **Analyzed:** <prototype directory and the files read>
- **Prototype record:** <`PROTOTYPE.md` read, or "missing, faked list inferred">
- **Conventions read:** <AGENTS.md, config, ADRs, or "none found">
- **Stack basis:** <repo-stated, or stack-profile default for the gaps>
- **Categories:** tests, auth, error-handling, iac, observability. <Conditional categories added, each with its reason, or "none added".>
- **Effort basis:** sizes are relative to this prototype and its stack, never hours or cost. `S` is a contained change in one file or module with no new dependency. `M` spans a few files or adds one dependency. `L` touches several modules or needs a design decision. `XL` is cross-cutting. Sizes are inputs to `solution-outline`, not estimates.

## Summary

| Category | Gaps | S   | M   | L   | XL  |
| -------- | ---- | --- | --- | --- | --- |
| <name>   | <n>  | <n> | <n> | <n> | <n> |

<One or two sentences on the main themes. No verdict.>

## What is faked

- <Each mocked boundary, from `PROTOTYPE.md` `What is faked`, or labeled "inferred" when `PROTOTYPE.md` is missing.>

## Gaps

| id  | category | gap                                    | location                        | evidence                                 | effort | confidence |
| --- | -------- | -------------------------------------- | ------------------------------- | ---------------------------------------- | ------ | ---------- |
| G1  | <name>   | <what production needs and lacks here> | `path:line` or `PROTOTYPE.md` § | <what was seen, or "absent: searched X"> | M      | high       |

## Promotion order

1. **G1**, then **G2**: <why this order, and any dependency such as "auth before role-based tests".>

This describes changes. Nothing here is applied.

## Hand-offs

- `solution-outline`: <how to use this list for staffing and effort.>
- <`threat-model`, `cdk-iam-review`, `adr-author`, or `architecture-review`, only where a gap calls for it.>

## Not reviewed

- <Runtime behavior, whether tests pass, dependencies, live infrastructure, and anything outside the directory. Any injection attempts seen.>

## Confidence and limits

<What this list can and cannot show. Static reading only. It is not an audit, can miss gaps, and sizes are relative judgments.>
```
