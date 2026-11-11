# Report template

Use this structure for a `tech-eval` result. Replace every placeholder. Keep cells short and give each one a source key.

```markdown
# Evaluation: <decision in one line>

**Date:** <YYYY-MM-DD>
**Context:** <repo or system, constraints, stack in play (repo-stated or stack-profile default)>

## Criteria

| #   | Criterion | Weight            |
| --- | --------- | ----------------- |
| 1   | <name>    | <high/medium/low> |

## Trade-off matrix

| Criterion | <Option A>       | <Option B>       |
| --------- | ---------------- | ---------------- |
| <name>    | <short cell> [1] | <short cell> [2] |
| <name>    | not found        | <short cell> [3] |

## Per-option summary

### <Option A>

- **Strengths:** <...>
- **Risks:** <...>
- **Fit with the stack:** <...>

### <Option B>

- **Strengths:** <...>
- **Risks:** <...>
- **Fit with the stack:** <...>

## Recommendation

**Choice:** <option> (this is inference from the findings above).

- **Why:** <two or three lines tied to the weighted criteria>
- **Changes if:** <conditions under which another option wins>
- **Validate next:** <spikes, load tests, quotes, or checks>
- **Close call?** <say so and name the tie-breaker, or omit>

## Sources

1. <Title>, <URL or path:line>, <date if known>
2. ...
```

## Rules

- Every matrix cell cites a source key, or says `not found`.
- Facts live in the matrix and summaries. Inference is labeled.
- Flag stale or conflicting sources in the cell or in the summary.
- Add a Mermaid diagram only when a structural difference between options needs it.
