# Eval results

## 2026-11-11 (M4 Phase 4: `threat-model` manual run)

- **Claude Code:** 2.1.322, `--plugin-dir plugins/lstk`, `--permission-mode plan`, run from `tests/fixtures/sample-repo`,
  invoked as `/lstk:threat-model` (the skill sets `disable-model-invocation`). Brief: model the order API from `infra/`
  and `src/`, inline output. Single run.
- **Seeded issues expected from TM** (`SEEDED-ISSUES.md`): SI-01, SI-02, SI-03, SI-04, SI-07. **Found: 5 of 5.** SI-04
  (TM-01), SI-07 (TM-03), SI-03 (TM-04), SI-01 and SI-02 (TM-05, handed to `cdk-iam-review`).
- **Also found, not seeded:** SI-05 (TM-06), unguarded `JSON.parse` (TM-07), no ownership check on cancel (TM-02, labeled
  inference), no access logging (TM-08). No false findings seen.
- **Secrets:** SI-07 reported by location and kind only. The value was not printed, in the table or the diagram.
- **Format:** all eight sections in order, the Mermaid diagram and element table present, every threat row has evidence
  and the nine columns, residual risk is not marked accepted. The model said it did not open `SEEDED-ISSUES.md`.
- **Weaknesses:** some cited line numbers were off for `cancel-order.ts` (the model read files in one pass). It named
  `cdk-iam-review`, which is built in Phase 5. The diagram used an unquoted subgraph title with a space (`AWS account`),
  which some Mermaid versions reject. Template fixed to quote subgraph titles; the rest is not tuned.

## 2026-11-11 (M4 Phase 3: `architecture-review` manual run)

- **Claude Code:** 2.1.322, `--plugin-dir plugins/lstk`, `--permission-mode plan`, run from `tests/fixtures/sample-repo`,
  invoked as `/lstk:architecture-review` (the skill sets `disable-model-invocation`). Brief: review `infra/` and `src/`,
  inline output. Single run.
- **Seeded issues expected from AR** (`SEEDED-ISSUES.md`): SI-01, SI-03, SI-04, SI-05. **Found: 4 of 4.** SI-04 (AR-01),
  SI-03 (AR-02), SI-01 and SI-02 (AR-03), SI-05 (AR-05, also listed under trade-offs). SI-07 also found (AR-04), with the
  location and kind only, no value printed.
- **Format:** all seven sections in order, pillar headings present, every finding cites `path:line`, trade-offs name
  the choice, the cost, and the condition. No "wrong", "secure", or "compliant" wording. No false findings seen.
- **Weaknesses:** the model mentioned `dependency-audit` as a hand-off, which is not built (Phase 6 gate). It cited
  CDK default behavior from memory, and said so under `Confidence and limits`. Not tuned.

## 2026-11-11 (M4 Phase 2: `code-reviewer` manual run)

- **Claude Code:** 2.1.322, `--plugin-dir plugins/lstk`, `--permission-mode plan`, run from `tests/fixtures/sample-repo`.
- **Brief:** three paths (`orders-stack.ts`, `cancel-order.ts`, `create-order.ts`), intent "add a cancel-order route and
  handler". Single run. The agent resolved as `lstk:code-reviewer` (Q1 note from Phase 1 confirmed).
- **Seeded issues expected from CR** (`SEEDED-ISSUES.md`): SI-04, SI-05, SI-06, SI-07. **Found: 4 of 4.** SI-04 (CR-01),
  SI-07 (CR-02), SI-05 (CR-06), SI-06 (test gap).
- **Also found, not expected from CR:** SI-01, SI-02 (CR-03) and SI-03 (CR-04), all handed off. No false findings seen.
  Extra true findings: handler does not cancel anything, unguarded `JSON.parse` in `create-order.ts`.
- **Format:** all six sections present in order, every finding cites `path:line`, no secret value printed.
- **Weaknesses:** the security findings ran longer than the "flag and hand off" rule intends, and the report did not say
  which config files were absent. One prompt tune made (hand-off findings stay to one line of evidence, `## Scope`
  names missing convention files). Not re-run after the tune.

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
