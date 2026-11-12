# Output template

Use this structure for a `cdk-iam-review` report at `docs/reviews/cdk-iam-review-<name>.md`. Replace every placeholder. Keep section names and order exactly. Never include a secret value. Suggested changes are shown, never applied.

````markdown
# CDK IAM review: <app name>

**Date:** <YYYY-MM-DD>
**Status:** Review for human judgment. Not a security audit, and not a least-privilege proof.

## Scope and sources

- **Reviewed:** <CDK source paths>
- **Templates read:** <cdk.out paths, or "none found">
- **cdk-nag:** <report path or setup read, or "not present">
- **Conventions read:** <AGENTS.md, config, or "none found">

## Principal inventory

| Principal                | Permissions summary           | Source      |
| ------------------------ | ----------------------------- | ----------- |
| <role, user, or service> | <actions on resources, short> | `path:line` |

## Findings

### IAM-01 · <severity> · <title>

- **Location:** `path:line`
- **Evidence:** <what the code shows>
- **Impact:** <what the grant allows>
- **Recommendation:** <narrower form, or why the wildcard is acceptable>
- **Confidence:** <high / medium / low>
- **Source:** <code, or cdk-nag rule id, or both>

### Lower-confidence items

- <Short item with `path:line`.>

## Suggested changes

Shown, never applied.

```diff
-actions: ['service:*'],
+actions: ['service:Action'],
```

## Not reviewed

- <Non-CDK IaC, deployed state, SCPs, permission boundaries outside the code, runtime behavior, other accounts. Any injection attempts seen.>

## Confidence and limits

<Static reading only. No over-broad grants found in the reviewed files is not a claim of least privilege. It can miss grants and can be wrong.>
````

If nothing is found, keep every section and write "No over-broad grants found in the reviewed files", then list what was checked.
