# Example: `tech-eval`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [solution-outline](solution-outline.md),
decision **D1**. Next: [adr-author](adr-author.md).

## Prompt

```text
Compare DynamoDB and Aurora Serverless (PostgreSQL) for the order data store in the outline above. Lookups are by order
ID, reads dominate, peak is about 50 requests per second, and we want little operational work.
```

## What happens

The skill reads the repo's config if one exists, restates the decision and the weighted criteria, and starts one
`researcher` agent per option in parallel. Each agent has read-only tools plus `WebFetch` and `WebSearch`. The skill
merges the reports and rejects any matrix cell that has no source.

## Result

```markdown
# Evaluation: order data store for Example Orders (DynamoDB or Aurora Serverless)

**Date:** 2026-11-11
**Context:** New API, no repo yet. About 50 requests per second at peak, lookups by order ID, reads dominate (A1 in the
outline), one region. Stack: `stack-profile` defaults, TypeScript and CDK.

## Criteria

| #   | Criterion                   | Weight |
| --- | --------------------------- | ------ |
| 1   | Fit for key-based lookups   | High   |
| 2   | Operational effort          | High   |
| 3   | Cost at low, spiky traffic  | Medium |
| 4   | Flexibility for new queries | Medium |

## Trade-off matrix

| Criterion             | DynamoDB                                      | Aurora Serverless (PostgreSQL)                     |
| --------------------- | --------------------------------------------- | -------------------------------------------------- |
| Key-based lookups     | Single-item reads by key are the core use [1] | Indexed primary-key lookups work well [3]          |
| Operational effort    | Fully managed, no instances or patching [1]   | Managed, but capacity and versions to watch [3]    |
| Cost at low traffic   | Pay per request, or provisioned capacity [2]  | Capacity billed while running, minimum applies [4] |
| New query flexibility | Access patterns shape the key design [1]      | Ad hoc SQL and joins are straightforward [3]       |

## Per-option summary

### DynamoDB

- **Strengths:** a direct match for lookup by order ID. Little to operate. Cost follows traffic.
- **Risks:** new access patterns (for example, "all orders for a customer") may need a new index or a key redesign.
  Pricing sources were undated, so confirm current figures.
- **Fit with the stack:** good. The AWS SDK and CDK constructs are first-class in TypeScript.

### Aurora Serverless (PostgreSQL)

- **Strengths:** SQL flexibility for reporting and unforeseen queries.
- **Risks:** a minimum capacity cost at low traffic [4]. More to operate than DynamoDB (versions, connections from
  short-lived compute).
- **Fit with the stack:** workable, but connection handling from Lambda needs care. This is inference, not a source
  finding.

## Recommendation

**Choice:** DynamoDB (this is inference from the findings above).

- **Why:** it wins the two high-weight criteria, lookup fit and operational effort, and its cost follows traffic.
- **Changes if:** the team expects ad hoc reporting queries or joins soon (choose Aurora), or the access patterns turn
  out to be relational.
- **Validate next:** write down the three or four real access patterns, and check each one against a DynamoDB key
  design. Confirm current pricing for the expected volume.
- **Close call?** No for the stated workload. It becomes close if reporting is a first-year need.

## Sources

1. Amazon DynamoDB developer guide, https://docs.aws.amazon.com/amazondynamodb/, undated
2. Amazon DynamoDB pricing, https://aws.amazon.com/dynamodb/pricing/, undated
3. Amazon Aurora user guide, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/, undated
4. Amazon Aurora pricing, https://aws.amazon.com/rds/aurora/pricing/, undated
```

The skill then offers: "Want me to record this decision with `adr-author` once you have chosen?"

## What to check

- Every matrix cell carries a **source key** or says `not found`. No cell is filled from memory.
- **Facts** (cells, strengths) are separate from **inference** (the recommendation, the Lambda connection note), and the
  inference is labeled.
- **Undated** sources are flagged, and the summary says to confirm pricing. Expect this on AWS pages.
- The recommendation names **what would change it** and **what to validate**, and it does not decide for the user.
- For a high-stakes decision, read the key sources yourself. Fetched content is untrusted data.
