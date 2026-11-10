# Fallback PR template

```markdown
## Summary

[1–3 sentences: what this PR does and why it is needed.]

Closes #[issue-number] <!-- or: Relates to PROJ-123 -->

## Changes

- [Behavioral or structural change, described at the level of intent, not file names]
- [...]

## How to Test

1. [Setup or precondition, e.g. branch, env var, seed data]
2. [Action: command, endpoint plus payload, or UI path]
3. Verify that [expected result].

**Automated tests:** [Tests added or updated. State which suites you ran and the result.]

## Screenshots / Evidence

[Before/after screenshots, logs, or response samples for UI or behavior changes. Otherwise: N/A.]

## Risk and Rollout

- **Impact:** [What parts of the system or which users are affected]
- **Breaking changes:** [None / describe, including API or contract changes]
- **Migrations, config, infra:** [None / DB migrations, new env vars or secrets, IaC or IAM changes, feature flags, deploy ordering]
- **Rollback:** [How to revert safely, or "Revert this PR"]

## Notes for Reviewers

- **Focus on:** [Where you want the closest review: tricky logic, design decision, security-sensitive code]
- **Out of scope / follow-ups:** [Known gaps, deferred work, tickets to be filed]

## Checklist

- [ ] Self-review of the diff completed
- [ ] Tests added or updated for the changes
- [ ] Lint, type-check, and build pass
- [ ] Documentation updated as needed (README, /docs, JSDoc, API specs)
- [ ] No secrets, credentials, or leftover debug code
```

## How to fill it

| Section                    | Guidance                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Summary**                | Lead with the _why_. A reviewer who reads only this should know the purpose.                                                                                                                                                    |
| **Changes**                | Describe behavior and design, not a file-by-file diff narration. Call out incidental or refactoring changes separately so reviewers don't mistake them for functional ones.                                                     |
| **How to Test**            | Concrete, runnable steps derived from the actual change (commands, endpoints with payloads, UI paths, expected output). Never invent steps for code paths you didn't read.                                                      |
| **Screenshots / Evidence** | Include only when it helps. You usually can't capture screenshots yourself; leave a clear `TODO: author to add before/after screenshots` and mention it in your final report.                                                   |
| **Risk and Rollout**       | The section that most often prevents incidents. Be explicit even when the answer is "None". For trivial PRs (typo, docs-only, comment changes), drop this section and Screenshots entirely rather than filling them with `N/A`. |
| **Notes for Reviewers**    | Direct attention. Say where the risky or debatable parts are, and what you deliberately did not do.                                                                                                                             |
| **Checklist**              | Follow the checklist-honesty rules in `SKILL.md`. Add repo-specific items if `CONTRIBUTING.md` or CI config implies them (changelog entry, OpenAPI regeneration, etc.).                                                         |
