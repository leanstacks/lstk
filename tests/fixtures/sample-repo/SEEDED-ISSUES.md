# Seeded issues (answer key)

Each row is a deliberate defect in this fixture. `tests/fixtures.test.mjs` checks that every location exists and that
its anchor text appears on that line, so this key cannot drift from the code.

Skills: `CR` = code-reviewer, `AR` = architecture-review, `TM` = threat-model, `IAM` = cdk-iam-review,
`DA` = dependency-audit (not built, see `docs/plans/PLAN-M4.md` Phase 6).

| ID    | Issue                                              | Location                         | Anchor                               | Expected from |
| ----- | -------------------------------------------------- | -------------------------------- | ------------------------------------ | ------------- |
| SI-01 | Over-broad IAM action (`dynamodb:*`)               | `infra/lib/orders-stack.ts:45`   | `actions: ['dynamodb:*']`            | IAM, TM, AR   |
| SI-02 | Wildcard resource on S3 actions                    | `infra/lib/orders-stack.ts:53`   | `resources: ['*']`                   | IAM, TM       |
| SI-03 | Publicly readable S3 bucket                        | `infra/lib/orders-stack.ts:20`   | `publicReadAccess: true`             | TM, AR        |
| SI-04 | Route without the authorizer (cancel order)        | `infra/lib/orders-stack.ts:62`   | `new LambdaIntegration(cancelOrder)` | TM, AR, CR    |
| SI-05 | Lambda timeout at the 15-minute maximum            | `infra/lib/orders-stack.ts:38`   | `Duration.minutes(15)`               | AR, CR        |
| SI-06 | Handler with no test (`tests/cancel-order.test.ts`) | `src/handlers/cancel-order.ts:8` | `export async function handler`      | CR            |
| SI-07 | Hardcoded secret (plainly fake)                    | `src/handlers/cancel-order.ts:2` | `WEBHOOK_SIGNING_KEY =`              | CR, TM        |
| SI-08 | Pinned vulnerable dependency (`lodash` 4.17.20)    | `package.json:11`                | `"lodash": "4.17.20"`                | none (DA not built) |

## Notes

- SI-04: the create route at `infra/lib/orders-stack.ts:58` uses the authorizer. The cancel route does not.
- SI-06: no file `tests/cancel-order.test.ts` may exist. The drift test asserts that.
- `lodash` is declared but not imported anywhere, which matters for a reachability triage.
- The fixture holds no real account, name, or secret. `111111111111` is a placeholder account ID.
