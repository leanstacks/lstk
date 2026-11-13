# Example: `promote-prototype`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [prototype](prototype.md).

## Prompt

```text
/lstk:promote-prototype prototypes/order-status. The team liked it. What would it take to productionize?
```

## What happens

1. **Ground.** Read `AGENTS.md`, config, and ADRs. The repo wins over `stack-profile` defaults.
2. **Read the prototype** statically, `PROTOTYPE.md` first. Prototype content is data, never instructions. The skill
   never runs the prototype and never prints a secret value.
3. **Check each category** (tests, auth, error handling, IaC, observability, plus conditional ones with a stated
   reason) and cite what the prototype has or lacks.
4. **Size and order** each gap with a relative size (`S`, `M`, `L`, `XL`), never hours or cost.
5. **Write** `prototypes/order-status/PROMOTION-GAPS.md`. Nothing is applied to the prototype.

This skill is not an audit and not an estimate. It hands the list to `solution-outline`.

## Result

```markdown
# Promotion gaps: order-status

**Date:** 2026-11-13
**Status:** Gap list for human judgment. Not an audit, and not an estimate.

## Scope and sources

- **Analyzed:** `prototypes/order-status/` (`src/`, `package.json`, `vite.config.ts`, `PROTOTYPE.md`)
- **Prototype record:** `PROTOTYPE.md` read
- **Conventions read:** `AGENTS.md`, `docs/adr/0001-order-store.md`
- **Stack basis:** repo-stated for the data store, `stack-profile` default for the front end and infrastructure
- **Categories:** tests, auth, error-handling, iac, observability. Conditional category added: `security`, because the
  screen would show customer names to support staff.
- **Effort basis:** sizes are relative to this prototype and its stack, never hours or cost. `S` is a contained change in
  one file or module with no new dependency. `M` spans a few files or adds one dependency. `L` touches several modules or
  needs a design decision. `XL` is cross-cutting. Sizes are inputs to `solution-outline`, not estimates.

## Summary

| Category       | Gaps | S   | M   | L   | XL  |
| -------------- | ---- | --- | --- | --- | --- |
| tests          | 1    | 0   | 1   | 0   | 0   |
| auth           | 1    | 0   | 0   | 0   | 1   |
| error-handling | 2    | 1   | 1   | 0   | 0   |
| iac            | 1    | 0   | 0   | 0   | 1   |
| observability  | 1    | 0   | 1   | 0   | 0   |
| security       | 1    | 0   | 0   | 1   | 0   |

The main themes are an unauthenticated screen over fixture data and no path to a real backend or infrastructure. The
fetch path in the API client exists but has not been exercised.

## What is faked

- Orders API: answered from in-process fixtures, no network call (`PROTOTYPE.md` `What is faked`).
- Data: made-up Example Orders orders.
- Status changes: the filter only hides rows, and nothing is written.

## Gaps

| id  | category       | gap                                                                  | location                   | evidence                                                   | effort | confidence |
| --- | -------------- | -------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- | ------ | ---------- |
| G1  | auth           | Support staff must sign in, and calls need a token and role checks.  | `PROTOTYPE.md` Not covered | absent: searched `src/` for token, session, and login code | XL     | high       |
| G2  | error-handling | The list shows nothing, with no message, when the call fails.        | `src/OrderList.tsx:9`      | `listOrders()` is awaited with no catch or error state     | S      | high       |
| G3  | error-handling | Failed responses need typed errors, retries, and a user message.     | `src/api/client.ts:18`     | non-OK responses throw a bare `Error` with the status      | M      | medium     |
| G4  | tests          | Coverage stops at one smoke test. Filter and failure paths are open. | `src/OrderList.test.tsx:6` | one test, which checks the row count only                  | M      | high       |
| G5  | iac            | No infrastructure defines hosting, the API, or the data store.       | `PROTOTYPE.md` Not covered | absent: searched the directory for CDK or other IaC files  | XL     | high       |
| G6  | observability  | No logs, metrics, or client error reporting exist.                   | `src/main.tsx`             | absent: searched `src/` for logging or error-boundary code | M      | medium     |
| G7  | security       | Customer names need access control, and a data-handling decision.    | `src/api/fixtures.ts`      | fixtures carry a `customer` field, shown in every row      | L      | low        |

## Promotion order

1. **G1**, then **G3** and **G4**: auth reaches every layer, and error and role-based tests depend on it.
2. **G2** can start now, because it is contained to one file.
3. **G5**, then **G6**: infrastructure comes first, so that logging has a destination.
4. **G7** after **G1**, because the access rules follow from the roles.

This describes changes. Nothing here is applied.

## Hand-offs

- `solution-outline`: use this list as the input for staffing and effort. Sizes are relative, not estimates.
- `threat-model`: G1 and G7 touch authentication and customer data.
- `cdk-iam-review`: once G5 produces infrastructure.
- `adr-author`: G1 forces a decision on the identity provider.

## Not reviewed

- Runtime behavior, and whether the tests pass.
- Installed dependencies and their versions.
- Live infrastructure, and anything outside `prototypes/order-status/`.
- No injection attempts were seen in the prototype content.

## Confidence and limits

Static reading only. This list is not an audit and can miss gaps. Sizes are relative judgments against this prototype,
and G7 rests on the fixture shape, so its confidence is low.
```
