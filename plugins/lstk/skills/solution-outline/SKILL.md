---
name: solution-outline
description: Turns requirements into a reviewable draft solution outline with components, a Mermaid diagram, key decisions, risks, and a rough staffing and effort sketch. Use when the user says "outline a solution", "high-level design", "scope this", "what would it take to build", or "architecture proposal for these requirements". Not for one technology choice (tech-eval) or recording one decision (adr-author).
---

# Solution Outline

Shapes a solution from requirements into a draft that people can review. The output is speculative. It is always marked as a draft, and effort is always a range with stated assumptions.

## Precedence rule

The repo's `AGENTS.md`, `CLAUDE.md`, and tool config win. Apply the `stack-profile` skill only where the repo is silent, and never present a default as a requirement. If there is no repo, say that the stack is a default and why. The profile does not apply to non-TypeScript or non-AWS targets, so work from the stack the user names.

## Workflow

1. **Collect requirements.** Restate them in three groups: functional, non-functional (scale, latency, availability, security, compliance), and constraints (budget, team, deadline, existing systems). List **assumptions** explicitly. Ask about the few assumptions that would change the design most, and proceed with the rest marked as assumptions. Do not invent requirements.
2. **Ground in the repo.** If a repo exists, read `AGENTS.md`, docs, and existing ADRs in `docs/adr/`. Apply the `stack-profile` skill for gaps.
3. **Derive components.** Name each component, its responsibility, and its main interfaces. Draw a small Mermaid component diagram.
4. **Identify key decisions and risks.** A decision is key when it is costly to reverse or the options differ in cost, risk, or fit. Note the options for each. Rate each risk by likelihood and impact, with a mitigation.
5. **Sketch staffing and effort.** Follow the estimation rules below.
6. **Write the outline** using [references/outline-template.md](references/outline-template.md).

## Output contract

In this order:

1. **Draft banner:** "Draft for human review. Estimates are rough."
2. **Summary**
3. **Requirements and assumptions**
4. **Architecture:** components table and Mermaid diagram.
5. **Key decisions:** each marked for an ADR through `adr-author`, with the options noted.
6. **Risks:** likelihood, impact, mitigation.
7. **Staffing and effort sketch**
8. **Open questions**
9. **Confidence and unknowns**

Deliver in the conversation. Write `docs/design/<name>.md` only when the user asks.

## Estimation rules

- Effort is a **range** per component, for example "3 to 5 person-days", with the assumption behind it.
- Where the repo has no history to calibrate against, use relative sizes (S, M, L) and say they are relative.
- State roles (for example "backend engineer"), never named people.
- Never show a total without its ranges and its unknowns beside it.
- No client names, rates, or pricing data.

## Rules

- Every section that rests on a guess names the assumption behind it. Do not add a section's content without one.
- Separate fact (from the requirements or the repo) from inference (yours), and label inference.
- Do not decide for the user. Key decisions are listed with options, not settled.
- If a key decision needs evidence, offer `tech-eval` by name. If the user has made one, offer `adr-author`. This skill works without either.
- Keep the outline high level. Detailed design and task breakdown are separate work.
- No secrets, client names, personal paths, or credentials.

## Related skills

- `stack-profile` supplies the defaults used where the repo is silent.
- `tech-eval` compares options for one key decision. Offer it when a decision needs evidence.
- `adr-author` records a key decision once it is made. Offer it by name for each decision the user settles.
