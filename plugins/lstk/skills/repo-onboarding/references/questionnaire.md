# Handoff Questionnaire

Used in Phase 4 after the Welcome Brief. The aim is to convert a static overview into a guided next step. Ask **one** question round, keep it short, and adapt depth to the answer.

## Opening prompt

Present the menu below, trimmed to options that apply to this repo (skip "tests" if none exist, skip "deploy" if there is no IaC). Example phrasing:

> What would be most useful next?
>
> 1. **Trace a feature**: follow one request/job end to end through the code
> 2. **Deep-dive a component**: e.g. `<most central package>` or `<second most important>`
> 3. **Get it running**: walk the setup and validate it (I'll ask before running anything)
> 4. **Tests**: show how the suite is organized and run it
> 5. **First change**: help pick and scope a small, safe first contribution
> 6. **What's active**: recent changes and hotspots
> 7. **Something else**

Optionally add a calibration line if it is not obvious from context: "Which of these stacks/tools are you already comfortable with? I'll skip the basics there."

## Follow-up playbooks

| Choice                    | What to do                                                                                                                                                                                                                                                                                                                                |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trace a feature**       | Ask which feature if unclear; otherwise use the primary flow. Walk entry point → each layer, citing `path:line` for each hop. Note validation, error handling, and persistence. Offer a sequence diagram if none exists.                                                                                                                  |
| **Deep-dive a component** | Read the component's entry file, public interface, and tests. Explain responsibilities, collaborators, and invariants. Point out where it deviates from conventions.                                                                                                                                                                      |
| **Get it running**        | Re-list prerequisites and check which are present (`node -v`, `python --version`, `docker --version`, etc.). Ask for consent, then run install → build → test in order, stopping at the first failure and diagnosing it. Report exactly what ran and its result. If the Getting Started section needed corrections, offer to fix the doc. |
| **Tests**                 | Explain test layout, frameworks, naming, fixtures/mocks, and what needs external services. Run the fast subset with consent. Identify gaps or flaky-looking areas only if evidence exists.                                                                                                                                                |
| **First change**          | Look for `good first issue` labels or TODO/FIXME clusters, small isolated modules, or documentation gaps. Propose 2–3 candidates with files involved, expected blast radius, and how to verify.                                                                                                                                           |
| **What's active**         | Summarize `git log` themes for the last few weeks, hotspot files, and open PR/branch names if available. Describe direction, not blame.                                                                                                                                                                                                   |
| **Something else**        | Treat it as a normal request with the overview as context.                                                                                                                                                                                                                                                                                |

## Behavioral rules

- Ask before running anything that installs, builds, starts services, hits the network, or writes files.
- If the user is clearly experienced, skip language and framework basics; focus on repo-specific structure and conventions.
- If you discover while answering that the overview is wrong or incomplete, say so and offer a precise doc fix; do not silently diverge.
- Do not re-explain what the overview already says; reference its sections.
- Keep a running list of questions you could not answer from the repo. Offer it at the end as a message the user can send to the maintainers.
