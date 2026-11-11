# Example: `adr-author`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [tech-eval](tech-eval.md).

## Prompt

```text
We chose DynamoDB for the order data store. Write the ADR.
```

## What happens

1. **Detect the convention.** The repo has no `docs/adr/`, `docs/decisions/`, or `adr-tools` config, so the skill uses
   the MADR-style default and says so.
2. **Gather.** The decision is clear (the user stated it). Options and evidence come from the `tech-eval` result.
3. **Confirm.** The skill proposes the title "Use DynamoDB for the order data store" and status `proposed`, and waits
   for a yes. The user says the decision is accepted, so the status is `accepted`.
4. **Write.** It creates the record and the index. It does not commit.

## Result

`docs/adr/0001-use-dynamodb-for-order-data-store.md`:

```markdown
# 0001. Use DynamoDB for the order data store

- **Status:** accepted
- **Date:** 2026-11-11
- **Deciders:** TODO(verify)
- **Related:** none

## Context

Example Orders needs a store for orders and their status history. Lookups are by order ID, reads dominate, and peak
load is about 50 requests per second. The team is small and wants little operational work. The evaluation compared
DynamoDB with Aurora Serverless (PostgreSQL) against lookup fit, operational effort, cost at low traffic, and query
flexibility. Sources: `tech-eval` result of 2026-11-11, items [1] to [4].

## Decision

We use DynamoDB for the order data store.

## Consequences

- **Good:** direct fit for lookup by order ID, no servers to patch, and cost that follows traffic.
- **Bad:** new access patterns may need a new index or a key redesign. Ad hoc reporting queries are harder than in SQL.
  This list is inferred from the evaluation. Review it.
- **Follow-ups:** write down the real access patterns and check each against the key design. Confirm current pricing
  for the expected volume.

## Alternatives considered

- **Aurora Serverless (PostgreSQL):** more query flexibility, but a minimum capacity cost at low traffic and more to
  operate.
```

`docs/adr/README.md`:

```markdown
# Architecture decision records

| #                                                 | Title                                 | Status   | Date       |
| ------------------------------------------------- | ------------------------------------- | -------- | ---------- |
| [0001](0001-use-dynamodb-for-order-data-store.md) | Use DynamoDB for the order data store | accepted | 2026-11-11 |
```

The skill reports the path, the status, and the open item: "Deciders is `TODO(verify)`. Tell me who decided."

## Later: superseding

If the team moves to Aurora in a year, the skill writes `0002-...` as a new record that supersedes 0001. In 0001 it
changes only the status line to `superseded by 0002`, with a link, and the index row. The decision text of 0001 stays as
it was.

## What to check

- The skill **followed an existing convention** if one existed, and said which convention it used.
- The **title and status were confirmed** before writing.
- The record states the decision **as made, in the present tense**, and does not invent one.
- Facts the user did not give (here, the deciders) are marked `TODO(verify)`.
- **Consequences list the bad as well as the good**, and say which ones are inferred.
- The index is updated, and no commit was made.
