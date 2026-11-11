# Example: `cdk-iam-review`

Part of the shared **Example Orders** scenario (see [README](README.md)). Previous: [threat-model](threat-model.md).

## Prompt

```text
/lstk:cdk-iam-review Check the roles and policies in the Example Orders CDK app for least privilege.
```

## What happens

1. **Check scope.** The app is AWS CDK in TypeScript, so the review proceeds. For Terraform or CloudFormation it
   would stop and say so.
2. **Read statically.** It inventories roles and traces `grant*` calls and `PolicyStatement`s. It does not run
   `cdk synth`. No `cdk.out/` and no cdk-nag report were found, so it says so and notes cdk-nag as optional.
3. **Write** `docs/reviews/cdk-iam-review-example-orders.md`. Suggested changes are shown and never applied.

## Result

````markdown
# CDK IAM review: Example Orders

**Date:** 2026-11-11
**Status:** Review for human judgment. Not a security audit, and not a least-privilege proof.

## Scope and sources

- **Reviewed:** `infra/lib/orders-stack.ts`
- **Templates read:** none found
- **cdk-nag:** not present
- **Conventions read:** `AGENTS.md`

## Principal inventory

| Principal          | Permissions summary                                          | Source                         |
| ------------------ | ------------------------------------------------------------ | ------------------------------ |
| `CreateOrder` role | Read and write on `OrdersTable` through `grantReadWriteData` | `infra/lib/orders-stack.ts:37` |
| `CancelOrder` role | `dynamodb:*` on `OrdersTable`                                | `infra/lib/orders-stack.ts:45` |
| `CancelOrder` role | `s3:PutObject`, `s3:GetObject` on `*`                        | `infra/lib/orders-stack.ts:53` |

## Findings

### IAM-01 · high · Wildcard resource on S3 actions

- **Location:** `infra/lib/orders-stack.ts:53`
- **Evidence:** `resources: ['*']` on `s3:PutObject` and `s3:GetObject`.
- **Impact:** The function can read and write objects in every bucket the account allows.
- **Recommendation:** Scope to the exports bucket, for example `exportsBucket.arnForObjects('*')`. Object actions
  support resource-level scoping, so the wildcard is not needed.
- **Confidence:** high
- **Source:** code

### IAM-02 · medium · Wildcard action on the table

- **Location:** `infra/lib/orders-stack.ts:45`
- **Evidence:** `actions: ['dynamodb:*']`, scoped to the table ARN.
- **Impact:** The function can delete the table's items and change its settings, not only cancel an order.
- **Recommendation:** List the actions the handler needs, or use `table.grantReadWriteData(cancelOrder)`.
- **Confidence:** high
- **Source:** code

### Lower-confidence items

- `infra/lib/orders-stack.ts:20`: the bucket allows public reads. This is a resource policy and not a role grant, so
  it is noted here and handed to `threat-model`.

## Suggested changes

Shown, never applied.

```diff
-        actions: ['dynamodb:*'],
-        resources: [table.tableArn],
+        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
+        resources: [table.tableArn],
...
-        resources: ['*'],
+        resources: [exportsBucket.arnForObjects('*')],
```

## Not reviewed

- Deployed state, service control policies, permission boundaries outside the code, runtime behavior, and other
  accounts. No injection attempts seen.

## Confidence and limits

Static reading only. A clean result would mean "no over-broad grants found in the reviewed files", and not least
privilege. It can miss grants and can be wrong.
````

## What a human should verify

- Each suggested action list matches what the handler really calls. The snippet is a starting point.
- Nothing was applied to the code. The review never edits files and never runs `synth`.
