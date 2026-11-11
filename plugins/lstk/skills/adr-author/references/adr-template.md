# ADR template (MADR-style)

Use this only when the repo has no ADR convention. File: `docs/adr/NNNN-kebab-title.md`.

```markdown
# NNNN. Title as a short noun phrase

- **Status:** proposed | accepted | deprecated | superseded by [NNNN](NNNN-kebab-title.md)
- **Date:** YYYY-MM-DD
- **Deciders:** roles or teams, not personal details
- **Related:** links to related records, or "none"

## Context

The situation and the forces at play: requirements, constraints, and the problem that forces a choice. Two to six sentences. Cite sources by key or URL.

## Decision

The choice, stated in the present tense. "We use X for Y."

## Consequences

- **Good:** what gets easier or safer.
- **Bad:** what gets harder, what it costs, and what risk it adds.
- **Follow-ups:** work or validation this decision requires.

## Alternatives considered

- **Option A:** one line on why it was not chosen.
- **Option B:** one line on why it was not chosen.
```

## Index (`docs/adr/README.md`)

```markdown
# Architecture decision records

| #                           | Title | Status   | Date       |
| --------------------------- | ----- | -------- | ---------- |
| [0001](0001-kebab-title.md) | Title | accepted | YYYY-MM-DD |
```

Keep rows in number order. When a record is superseded, change its status cell to `superseded by NNNN`.

## Notes

- Number with zero padding (`0001`). The next number is the highest existing plus one, and numbers are never reused.
- Keep Context short. Link to research rather than pasting it.
- Remove empty sections rather than writing filler.
