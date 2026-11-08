# lstk — LeanStacks Agentic Toolkit

A [Claude Code](https://code.claude.com) plugin marketplace that helps engineers and architects research, design,
develop, review, and harden applications, and prototype quickly. It is AWS-first and TypeScript-first.

> **Status:** pre-release, M0 scaffold. Both plugins are empty. Skills and hooks arrive in later milestones. See
> [docs/PLAN.md](docs/PLAN.md).

## Plugins

| Plugin            | Purpose                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `lstk`            | Lifecycle skills and agents: research, design, develop, review, harden, prototype.           |
| `lstk-guardrails` | Deterministic guardrail hooks and an `init` skill that bootstraps safer permission settings. |

The plugins install independently, because enforcement posture varies by client. Skills are namespaced by plugin name,
for example `/lstk:<skill>`.

## Install

```text
/plugin marketplace add leanstacks/lstk
/plugin install lstk@lstk
/plugin install lstk-guardrails@lstk
```

The `/lstk-guardrails:init` skill arrives in M1.

## Guardrail model

_Coming in M1: the layers, the threat model, and the limits of hooks._

## Development

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

[MIT](LICENSE)
