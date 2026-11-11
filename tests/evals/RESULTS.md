# Eval results

## 2026-11-11 (M3 skills)

- **Claude Code:** 2.1.322
- **Model:** `sonnet` alias, resolved to `claude-sonnet-5-5`
- **Method:** as for 2026-11-10, with `--plugin-dir plugins/lstk`, `--max-turns 3`, `--permission-mode plan`, and a
  throwaway git repo (one-line `index.js` and a short README). Single run per prompt. A skill counts as fired when the
  stream holds a `Skill` tool call for it, and a sibling firing counts as a pass for a negative.
- **Caveat:** the run used a user environment with other plugins installed. The `researcher` agent is covered through
  `tech-eval`, whose trigger fired without running the research (the turn cap stops it first).

| Skill              | Passed | Notes                                                                        |
| ------------------ | ------ | ---------------------------------------------------------------------------- |
| `stack-profile`    | 6/6    | Also loaded alongside `tech-eval` and `solution-outline` on stack questions. |
| `tech-eval`        | 7/7    | `stack-profile` loaded together with it on `tech-eval-02`.                   |
| `adr-author`       | 6/6    | `adr-author-02` missed once, then fired 3 of 3 on repeat (flaky, no change). |
| `solution-outline` | 7/7    | `solution-outline-03` prompt fixed (below), 1 iteration.                     |

### Iterations

1. **`solution-outline-03`.** The prompt said "Here are the requirements" and listed none. It missed 3 of 3, because
   Claude had nothing to outline. The defect was in the prompt, not the description. The prompt now includes four
   requirements, and the skill fired 3 of 3. The description is unchanged.
2. **`adr-author-02`** ("We settled on DynamoDB for order lookups. Document why we chose it."). One miss in the full
   run, then 3 of 3 fires on repeat. No change.

### Open gaps

- Single run per prompt, so near-misses may flip on another run (`adr-author-02` already did).
- `researcher` behavior beyond the trigger is covered by the Phase 3 smoke test, not by evals.
- Phase 3 asked this run to check that the "undated source" flags persist. A turn-capped trigger run cannot show that,
  so it stays open.

## 2026-11-10

- **Claude Code:** 2.1.322
- **Model:** `sonnet` alias, resolved to `claude-sonnet-5-5`
- **Method:** each prompt ran once in a fresh `claude -p` session, in a throwaway git repo with a one-line `index.js`,
  an uncommitted change, and a short README. The plugin was loaded with `--plugin-dir plugins/lstk`, with
  `--max-turns 3` and `--output-format stream-json`. A skill counts as fired when the stream holds a `Skill` tool call
  for it. For the explicit `/lstk:create-pull-request` case, which expands the skill inline and makes no `Skill` call,
  the first tool call matching the skill's first step (`gh repo view`) counts.
- **Negatives that belong to a sibling:** a sibling skill firing counts as a pass for the skill under test.
- **Caveat:** the run used a user environment with other plugins installed. Single runs, not repeated, apart from the
  `local-setup-author` miss below.

| Skill                 | Passed | Notes                                        |
| --------------------- | ------ | -------------------------------------------- |
| `commit-messages`     | 7/7    |                                              |
| `create-pull-request` | 5/5    | Explicit invocation works. No auto-trigger.  |
| `agents-md-author`    | 6/6    | "Onboard me" routed to `repo-onboarding`.    |
| `repo-onboarding`     | 6/6    | "How do I get this running" routed to setup. |
| `local-setup-author`  | 6/6    | One description change, below (1 iteration). |

## Iterations

1. **`local-setup-author`, prompt 03** ("Check whether the setup instructions in our README still work"). First run:
   skill did not fire, in 3 of 3 repeats (the model read the README and answered directly). The description said "audit
   setup instructions". Changed to "audit, check, or verify that setup instructions (README steps, "does this still
   work") are correct". Afterwards: fired in 3 of 3 repeats, and in the full re-run. All 28 prompts passed in the
   full re-run with the new description.
2. **Harness changes (not description changes).** The first pass used `--max-turns 1` and no README, which cut off
   skills that fire after the model reads the repo. The first pass also showed that `-p` expands a slash command
   inline, so the explicit case needed a different detection (see Method).

## Open gaps

- Single run per prompt. Triggering is not deterministic, so near-misses (such as the `repo-onboarding` and
  `local-setup-author` boundary) may flip on another run.
- `commit-messages` stays model-invocable (Q1). No over-triggering showed in the negative prompts.
