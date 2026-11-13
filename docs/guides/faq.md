# FAQ

Common questions about running lstk skills and agents.

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

The legend for the step tags is in the [lifecycle map](lifecycle.md#how-to-invoke-each-piece). The skill and agent
tables are in the [README](../../README.md#skills).

## I asked in words and nothing happened. Why?

The skill is probably **type it**: it runs only when you type the slash command. These skills set
`disable-model-invocation`, so Claude never loads them on its own. This is on purpose. They write files, run long
analyses, or call external tools.

Type the command with the plugin prefix:

| Skill                 | Command                     |
| --------------------- | --------------------------- |
| `architecture-review` | `/lstk:architecture-review` |
| `threat-model`        | `/lstk:threat-model`        |
| `cdk-iam-review`      | `/lstk:cdk-iam-review`      |
| `prototype`           | `/lstk:prototype`           |
| `promote-prototype`   | `/lstk:promote-prototype`   |
| `create-pull-request` | `/lstk:create-pull-request` |
| `init`                | `/lstk-guardrails:init`     |

A bare `/<skill>` also works unless another plugin uses the same name. The other skills are **say it**: Claude may load
them when your words match what the skill is for, and you can still type the slash command to be sure.

## A skill that should trigger did not. What do I check?

1. **Is it installed?** Type `/` and look for `lstk:` in the menu, or type `/skills`. In the `/plugin` screen, the
   Installed tab shows what is loaded and the Errors tab shows what failed. If the skill is missing, see
   [getting started](getting-started.md).
2. **Did you reload after an update?** After a plugin changes, update the marketplace and the plugin, then run
   `/reload-plugins`. A local marketplace does not update itself.
3. **Does your prompt match the skill?** A say-it skill is chosen from its description. A vague prompt can match
   nothing. Name the skill (`with the adr-author skill`) or type the slash command.
4. **Is it the wrong skill?** Each skill has a "not for" line. `adr-author` records a decision already made, and
   `tech-eval` compares options. Asking one to do the other's job gets a redirect.

## How do I run an agent?

Agents are **delegate it**: you ask Claude, and Claude hands the work to the agent. There is no slash command.

- Ask in words: "Delegate this diff to the `lstk:code-reviewer` agent."
- Or name the agent with `@agent-lstk:code-reviewer` to make sure it is used.

The agent does **not** see your conversation, the skills you ran, or the files you read. It gets only the prompt you
delegate, your repo's `CLAUDE.md` files, and a git status snapshot. So the prompt must carry the diff or the paths, and
the intent of the change. `code-reviewer` has no shell, so Claude must run `git diff` first and pass the result.
Without a diff or paths, it asks for them and stops.

There is no confirmed command that lists loaded agents, so do not rely on one. If delegation seems not to happen, name
the agent with `@agent-lstk:<name>`.

## The agent reviewed my code but did not fix anything. Is it broken?

No. `code-reviewer` and `researcher` are read-only, and they never change files. `code-reviewer` reports findings,
and you ask Claude, in your main session, to fix the ones you accept. The same is true of the review skills:
`cdk-iam-review` shows diffs and never applies them.

## A hook blocked my call. What do I do?

1. **Read what was blocked.** The block says which call was stopped. If the message is not shown to you, ask Claude
   what was blocked and why.
2. **Decide as a human.** `block-cdk-mutate` denies CDK `deploy`, `destroy`, and `watch`, and asks about `bootstrap`.
   `protect-files` denies edits to `.env`, `.env.*`, `package-lock.json`, and `.git/`. These stop mistakes, and the
   block is usually right.
3. **Do the action yourself if it is legitimate.** Deploy from your own terminal with your own credentials. Edit a
   secret yourself. Ask Claude to help you with the part that is not blocked.
4. **Never turn the hook off, and never ask Claude to work around it.** The skills do not do this for you either. If
   a path really should be editable in your project, the [guardrail configuration](../../README.md#configuration) is
   yours to change, deliberately, in your own repo.

A hook is not a sandbox. It sees the command text and not its effects, so it can miss indirect routes. The real
guarantee is credentials: give Claude a read-only AWS identity. See the
[guardrail model](../../README.md#guardrail-model).

## Claude ignored the lstk default stack. Is that a bug?

No. The default stack (TypeScript ESM, NestJS on containers, Lambda, Vite and React, AWS CDK, Vitest, oxlint,
Prettier) is held by the background skill `stack-profile`. It applies **only where your repo is silent**. Your
`AGENTS.md`, `CLAUDE.md`, and tool config always win, and the review skills and `code-reviewer` check your code against
what your repo says. A choice that follows your stated stack is not a finding.

If Claude keeps drifting to a default you do not use, your repo is silent about it. Run `agents-md-author` to write it
down. See [getting started](getting-started.md#3-the-first-five-minutes-in-an-existing-repo).

## Where did the skill write its file, and should I commit it?

| Output                                              | Written by                              | Commit?                                 |
| --------------------------------------------------- | --------------------------------------- | --------------------------------------- |
| `AGENTS.md`                                         | `agents-md-author`                      | Yes                                     |
| `docs/PROJECT_OVERVIEW.md`, `docs/LOCAL_SETUP.md`   | `repo-onboarding`, `local-setup-author` | Yes                                     |
| `docs/design/<name>.md` (only when you ask)         | `solution-outline`                      | Yes, marked as a draft                  |
| `docs/research/<topic>.md` (only when you ask)      | `tech-eval`                             | Yes                                     |
| `docs/adr/NNNN-<title>.md`                          | `adr-author`                            | Yes                                     |
| `docs/reviews/*.md`, `docs/threat-models/<name>.md` | the review skills                       | A team choice, usually yes              |
| `prototypes/<name>/`, `PROMOTION-GAPS.md`           | `prototype`, `promote-prototype`        | A team choice. Prototypes are throwaway |

A skill that can write a file offers to give the result inline instead. The `code-reviewer` and `researcher` agents
never write a file.

## Why is there no skill for implementing a feature, fixing a bug, or test coverage?

Those steps are plain Claude Code, and lstk does not add a skill that would do the same work with more ceremony. lstk
adds what surrounds them: grounding (`AGENTS.md`, `repo-onboarding`), review (`code-reviewer`), commits
(`commit-messages`), pull requests (`create-pull-request`), and the hooks. The recipes in
[existing projects](existing-projects.md) show where each fits.

## What does lstk not do?

- **It does not deploy.** The hooks deny CDK deploys, and no skill runs one. Prototypes never deploy.
- **It does not fix code in a review.** Reviews report. You fix through the normal loop.
- **It does not certify anything.** No review states that a design or a system is secure, correct, or compliant. They
  are static reads and can miss issues. They are not audits or penetration tests.
- **It does not scaffold a production repo.** `prototype` builds a throwaway spike. See
  [start a repo with a chosen stack](new-projects.md#start-a-repo-with-a-chosen-stack).
- **It does not triage dependencies.** `dependency-audit` was considered and not built. See
  [harden a service](review-and-hardening.md#harden-a-service).
- **It does not cover other IaC.** `cdk-iam-review` covers AWS CDK in TypeScript only.
- **It does not support other agents or Windows.** lstk is for Claude Code on macOS and Linux.

Ideas that are not built yet are tracked in the backlog. The links are added when the backlog is filed.

## Are these guides installed with the plugins?

No. The guides live in the repository and are read on GitHub. Plugins are copied to a cache without `docs/`, so they
are not available inside a session. Open the [guides index](README.md) in the repo.
