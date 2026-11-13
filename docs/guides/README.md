# lstk user guides

Task-first guides for people using the lstk plugins. For install and the full skill and agent tables, see the
[README](../../README.md). For contributors, see [CONTRIBUTING](../CONTRIBUTING.md).

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

## I want to...

| I want to...                                           | Go to                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Install lstk and try it on my repo                     | [Getting started](getting-started.md)                                              |
| See which skill fits which stage                       | [Lifecycle map](lifecycle.md)                                                      |
| Add a feature to an existing project                   | [Existing projects](existing-projects.md#add-a-feature)                            |
| Enhance an existing feature                            | [Existing projects](existing-projects.md#enhance-an-existing-feature)              |
| Fix a bug                                              | [Existing projects](existing-projects.md#fix-a-bug)                                |
| Improve test coverage                                  | [Existing projects](existing-projects.md#improve-test-coverage)                    |
| Design a new solution                                  | [New projects](new-projects.md#create-a-solution-design)                           |
| Start a repo with a chosen stack                       | [New projects](new-projects.md#start-a-repo-with-a-chosen-stack)                   |
| Try an idea quickly, then decide                       | [New projects](new-projects.md#prototype-first-then-promote)                       |
| Review a code change                                   | [Review and hardening](review-and-hardening.md#review-a-change)                    |
| Review a design or a CDK app                           | [Review and hardening](review-and-hardening.md#review-a-design)                    |
| Harden a service                                       | [Review and hardening](review-and-hardening.md#harden-a-service)                   |
| Prepare for a release or client handoff                | [Review and hardening](review-and-hardening.md#before-a-release-or-client-handoff) |
| Find out why a skill did not run or a call was blocked | [FAQ](faq.md)                                                                      |

## How the guides are written

- Each recipe lists ordered steps, a copy-paste prompt per step, the file it produces, and when to skip a step.
- Each step says how it runs: **type it**, **say it**, **delegate it**, or **plain Claude Code**. See the legend in the
  [lifecycle map](lifecycle.md#how-to-invoke-each-piece).
- Each recipe says what lstk adds and what is plain Claude Code. lstk has no skill for implementing, bug fixing, or test
  coverage, and the guides say so.
- Skills are referenced by name. The [README](../../README.md#skills) is the single place that describes them.
- Examples use the fictional Example Orders system. See [worked examples](../examples/README.md).
