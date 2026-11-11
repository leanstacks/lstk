# Eval results

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
