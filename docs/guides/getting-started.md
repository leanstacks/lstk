# Getting started

Install lstk, turn on the guardrails, and get your first useful results in an existing repo in about five minutes.

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

## 1. Install

In Claude Code, add the marketplace and install both plugins:

```text
/plugin marketplace add leanstacks/lstk
/plugin install lstk@lstk
/plugin install lstk-guardrails@lstk
```

Choose a scope when asked. The plugins install independently. `lstk` holds the skills and agents. `lstk-guardrails`
holds the safety hooks.

To check the install, type `/` and look for `/lstk:` entries, or run `/skills`. `/plugin` shows installed plugins and
any load errors.

## 2. Turn on the guardrails

Run the init skill once:

```text
/lstk-guardrails:init
```

It asks two things:

- **Scope.** _User_ applies once per machine. _Project_ is committed so the whole team gets it.
- **Convenience rules.** An optional set of allow rules that cut permission prompts for safe, read-only commands.

It shows a dry-run diff first. Review it, then confirm. The merge adds rules and never removes yours. If you already
had hooks from these scripts in your own Claude Code settings, remove that old block so they do not run twice, then run
`/reload-plugins`. Details are in the [guardrail model](../../README.md#install-and-init).

## 3. The first five minutes in an existing repo

Open Claude Code in the repo. Run these three in order. Each is a skill Claude may load when you ask in plain words
([say it]), or you can type its slash command.

| Step | Ask for                                           | You get                                                                      |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `agents-md-author`: the repo's agent instructions | `AGENTS.md`: commands, layout, and conventions Claude will follow.           |
| 2    | `repo-onboarding`: an overview of the project     | `docs/PROJECT_OVERVIEW.md`: what the system is and how it is organized.      |
| 3    | `local-setup-author`: a setup guide               | `docs/LOCAL_SETUP.md`: from a fresh clone to a working edit-build-test loop. |

Copy-paste prompts:

```text
Create or refresh AGENTS.md for this repo. Judge any existing CLAUDE.md or other instruction files first.
```

```text
Onboard me to this repo. Produce or update docs/PROJECT_OVERVIEW.md.
```

```text
Check docs/LOCAL_SETUP.md against the repo and update it so a fresh clone reaches a running app.
```

Each skill reuses what is already good and only changes what is stale. Each writes a file you should review and
commit. They never edit one another's files.

**Why this order.** `AGENTS.md` is read by Claude in every later session, so it pays back first. The overview helps you
(and Claude) learn the code. The setup guide proves the repo builds and tests.

If your repo has no `AGENTS.md`, every other skill falls back to the lstk default stack. When the repo has its own
`AGENTS.md`, it always wins.

## 4. Skills, agents, and hooks: what each is

| Piece     | What it is                                                                        | Example                                  |
| --------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| **Skill** | Instructions Claude follows for one kind of task. Some run only if you type them. | `/lstk:adr-author`, `/lstk:threat-model` |
| **Agent** | A read-only helper with its own context. It sees only what you hand it.           | `code-reviewer`, `researcher`            |
| **Hook**  | A script that runs before a tool call and can deny or ask. It is not a sandbox.   | `block-cdk-mutate`, `protect-files`      |

Two terms the guides use:

- **ADR**: an Architecture Decision Record, a short Markdown file that records one decision and why it was made.
  `adr-author` writes them.
- **Plan mode**: a Claude Code mode where Claude reads and proposes a plan, and edits stay blocked until you approve.
  Press `Shift+Tab` to cycle modes, or start a prompt with `/plan`. See the
  [Claude Code docs](https://code.claude.com/docs/en/permission-modes).

Skills marked **type it** run only when you type the slash command. If nothing happens when you ask in words, see the
[FAQ](faq.md).

## Next

- Place your task on the build loop: [lifecycle map](lifecycle.md).
- Pick a recipe: [guides index](README.md).
