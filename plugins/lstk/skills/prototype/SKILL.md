---
name: prototype
description: Scaffolds a throwaway prototype in prototypes/<name>/, either a Vite + React web app with a mocked API or a single Lambda handler with local invocation, and writes an honest PROTOTYPE.md. User-invoked only, because it writes a whole file tree. Use when the user says "prototype this", "spike", "proof of concept", "mock up", or "scaffold a demo". Not for production code, and not for estimating (solution-outline).
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/scripts/scaffold.mjs" *), Read, Write, Edit, Glob, Grep
---

# Prototype

This skill is user-invoked only (`/lstk:prototype`), because it writes a whole file tree.

Stub. The full workflow, output contract, and limits are added in Phase 3 of `docs/plans/PLAN-M5.md`.
