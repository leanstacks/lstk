# How lstk was built

The story of the lstk marketplace, milestone by milestone: what was decided, what was verified instead of assumed, and
what was cut. The sources are [docs/PLAN.md](PLAN.md) and the per-milestone plans in [docs/plans](plans), each of which
ends with phase records.

## The method

Each milestone had a plan file. The plan split the work into phases small enough for one clean Claude Code session.
Every phase had:

- **A goal and the context to load**, so a new session could start cold.
- **An acceptance check**, always including `npm run check`.
- **One commit.**
- **A handoff note** appended to the plan, recording what the next session needed to know.

The handoff notes are why a session never had to re-derive earlier work. They also kept a record of what changed from the
plan. Several plans say "as built" where reality differed, and the phase records say why.

Three habits held across every milestone:

1. **Verify, do not assume.** Claims about Claude Code (plugin manifests, hook contracts, plan mode, how subagents see
   context) were checked against the official docs and `claude plugin validate`, and the version and date were recorded.
   [ARCHITECTURE.md](ARCHITECTURE.md) and each guide carry a "last verified" line.
2. **Test the contract, not the prose.** Hooks have a fixture matrix of allowed, asked, and denied calls. Every skill has
   a trigger eval file. Report skills have output contracts that tests check against the worked examples. The guides
   have link and coverage tests.
3. **Run it before documenting it.** The guides were run once, as written, before they were called done (M6, phase 6).

## Milestones

| Milestone | Released                   | What it delivered                                                                                                               |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0        | n/a                        | Repo, tooling (Vitest, oxlint, Prettier), manifest and frontmatter linter, CI, and a verified plugin contract.                  |
| M1        | `lstk-guardrails` 0.1.0    | Two hooks (`block-cdk-mutate`, `protect-files`), permission snippets, and the `init` skill that merges them into settings.      |
| M2        | `lstk` 0.1.0               | Five skills migrated from private use and cleaned for a public repo: commit messages, PRs, and three repo-documentation skills. |
| M3        | `lstk` 0.2.0               | `stack-profile`, `tech-eval` with the `researcher` agent, `adr-author`, and `solution-outline`.                                 |
| M4        | `lstk` 0.3.0               | `code-reviewer`, `architecture-review`, `threat-model`, and `cdk-iam-review`.                                                   |
| M5        | `lstk` 0.4.0               | `prototype` and `promote-prototype`: throwaway spikes and a gap list for taking one to production.                              |
| M6        | `lstk` 0.4.1 (docs mostly) | User guides, a README that routes to them, marketplace metadata, and a triaged backlog.                                         |

## Decisions that mattered

The full table is in [PLAN.md](PLAN.md#2-decisions). The ones that shaped the most work:

- **D2, two plugins.** Enforcement posture varies by client, so guardrails install independently of the skills.
- **D4, Node `.mjs` hooks with no dependencies.** Plugins ship no shell scripts and no `node_modules`. The hooks are
  testable with Vitest and need neither `bash` nor `jq`.
- **D5, an `init` skill instead of shipped permissions.** A plugin cannot ship `deny`, `ask`, or `allow` rules. `init`
  merges a vetted snippet into settings, shows a diff first, and never removes or reorders existing rules.
- **D6, stack defaults that yield.** `stack-profile` holds the default stack and states that the repo's own `AGENTS.md`
  and config win.
- **D8, side effects need a human.** Skills that write reports, open pull requests, or scaffold code set
  `disable-model-invocation: true`, so only the slash command runs them.

## Verified instead of assumed

- **How hooks block.** Hooks deny or ask through the JSON `permissionDecision` output, not exit code 2. A deny holds in
  every permission mode.
- **Plugin isolation.** Installed plugins are copied to a cache, so a plugin cannot reference files outside its own
  directory. The linter flags `../` references, and nothing is shared across plugins.
- **What a subagent sees.** It does not see the conversation or earlier skills. Every hand-off to `code-reviewer` carries
  the diff and the intent.
- **What the hooks cannot do.** A hook sees a command string, not its effects. The README says so, and says the real
  guarantee is credentials.
- **Manifest metadata.** `claude plugin validate --strict` was run before `keywords` was added.
- **The guides themselves.** Running them found one real defect: three report skills said "create the folder if it is
  missing", which led the model to shell commands that were denied. The skills now say to use the Write tool.

## What was cut, and why

- **`dependency-audit` (M4).** It was gated on adding value beyond `npm audit`. A hand run on the fixture showed only
  reachability triage as added value, and a plain prompt already gives that. The guides document the manual steps.
- **Scaffold skills, AWS MCP servers, and a formatting hook (M6).** They were triaged to
  [backlog issues](https://github.com/leanstacks/lstk/issues/21) with four promotion criteria: the workflow recurred at
  least three times, plain Claude Code was tried first, a trigger eval and example can be written, and no guardrail
  weakens. Each is a commitment (tests, evals, examples, version churn) that should be made on evidence.

## What the guides learned

The main finding of M6: lstk is strong on discover, plan, review, harden, commit, and pull request, and has **no skill
for implementing a feature, fixing a bug, or improving test coverage**. Those steps are plain Claude Code. The guides say
so in every recipe rather than overselling a skill that does not exist.

## Read next

- [Getting started](guides/getting-started.md) and the [guides index](guides/README.md)
- [Walkthrough: a bug fix](guides/walkthrough-bug-fix.md)
- [PLAN.md](PLAN.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
