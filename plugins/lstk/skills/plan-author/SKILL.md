---
name: plan-author
description: Writes a docs/plans/PLAN-<id>.md implementation plan in one of two fixed shapes, a milestone plan or a phase plan whose phases each fit one agentic session, and adds it to the plans index when the repo has one. User-invoked only, because it writes files. Use when the user types /lstk:plan-author with an issue, a milestone reference, or a brief. Not for plain plan mode, an outline (solution-outline), or recording a decision (adr-author).
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit
---

# Plan Author

This skill is user-invoked only (`/lstk:plan-author`), because it writes files. It never runs on its own.

Stub. The workflow, output contract, and templates are added in Phase 2 of `docs/plans/PLAN-0023.md`.
