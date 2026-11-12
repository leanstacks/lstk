# IAM patterns in CDK TypeScript

Risky patterns to look for, and the narrower form to suggest. Suggestions are shown as diff-style snippets and never applied. A pattern is a lead to check, not a verdict: confirm it in the code and say when it is acceptable.

## Where to look

| Construct or call                                                   | What it creates                  |
| ------------------------------------------------------------------- | -------------------------------- |
| `new Role(...)`, `new User(...)`, `new Group(...)`                  | Principals                       |
| `fn.role`, the implicit role of `Function` or `NodejsFunction`      | A role per function              |
| `grant*`, `grantRead`, `grantReadWriteData`, `grant(...)`           | Identity-based statements        |
| `addToRolePolicy`, `addToPrincipalPolicy`, `addToResourcePolicy`    | Hand-written statements          |
| `new PolicyStatement`, `new PolicyDocument`, `new ManagedPolicy`    | Statements and managed policies  |
| `ManagedPolicy.fromAwsManagedPolicyName`, `managedPolicies:`        | Managed policy attachments       |
| `assumedBy`, `AccountPrincipal`, `ServicePrincipal`, `ArnPrincipal` | Trust policies                   |
| `bucket.addToResourcePolicy`, `publicReadAccess`, `AnyPrincipal`    | Resource policies, public access |
| `iam:PassRole`, `sts:AssumeRole`                                    | Privilege hand-off               |

## Patterns

### 1. Wildcard action (`service:*` or `*`)

Risk: grants every current and future action on the service.

```diff
-actions: ['dynamodb:*'],
+actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
```

Prefer a `grant*` method (`table.grantReadWriteData(fn)`), which scopes to the resource. Acceptable when: the service has no narrower action set for the job, and the resource is also scoped. State why.

### 2. Wildcard resource (`resources: ['*']`)

Risk: the actions apply to every matching resource in the account.

```diff
-resources: ['*'],
+resources: [bucket.arnForObjects('*')],
```

Acceptable when: the action does not support resource-level permissions (some list, describe, and tagging actions). Say which action and cite the AWS documentation through the `researcher` agent or a link the user gave. Do not assert it from memory.

### 3. `iam:PassRole` without a condition

Risk: the principal can hand a more powerful role to a service.

```diff
-actions: ['iam:PassRole'], resources: ['*'],
+actions: ['iam:PassRole'], resources: [role.roleArn],
+conditions: { StringEquals: { 'iam:PassedToService': 'lambda.amazonaws.com' } },
```

### 4. Cross-account or broad trust

Risk: `assumedBy: new AccountPrincipal(...)` with no external ID or condition, `AnyPrincipal`, or an `ArnPrincipal('*')`. Report the principal kind.

### 5. Broad managed policies

Risk: `AdministratorAccess`, `PowerUserAccess`, `*FullAccess`, or the AWS managed `AWSLambdaBasicExecutionRole` swapped for something wider. cdk-nag reports these as `AwsSolutions-IAM4`.

Prefer a customer-managed policy with named actions. Acceptable when: a short-lived or sandbox role and the user says so.

### 6. Shared role across functions

Risk: one `Role` passed to several `Function` constructs, so the union of all permissions applies to each.

Prefer the implicit per-function role and `grant*` per function.

### 7. Public resource policy

Risk: `publicReadAccess: true`, `AnyPrincipal`, or a policy with `Principal: '*'` and no condition. Report it here as an access finding, and hand the data-exposure analysis to `threat-model`.

### 8. Missing boundary or condition

Risk: roles for human or CI use with no `permissionsBoundary`, or statements that could carry `aws:SourceArn` and `aws:SourceAccount` conditions (service principals invoking on a resource's behalf) and do not. Low severity unless the principal is cross-service with broad access.

### 9. Inline policies that duplicate a grant

Risk: a hand-written statement next to a `grant*` call for the same resource, which can hide the wider of the two. Report both and say which is wider.

## Severity guide

| Severity | Typical pattern                                                                          |
| -------- | ---------------------------------------------------------------------------------------- |
| `high`   | Wildcard action on a data or identity service, `PassRole` on `*`, `Principal: '*'`       |
| `high`   | `publicReadAccess: true` or `AnyPrincipal` on a data store (state what the bucket holds) |
| `medium` | Wildcard resource with write actions, broad managed policy, shared role, open trust      |
| `low`    | Missing condition or boundary, wildcard on read-only actions without resource support    |
| `info`   | Acceptable wildcard with a stated reason, or a note for the owner                        |

Severity is the reviewer's judgment from the code alone. It does not account for the deployed environment.
