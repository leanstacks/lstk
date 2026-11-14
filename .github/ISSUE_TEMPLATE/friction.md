---
name: Friction report
about: Report unexpected behavior, a wrong guide, or a hook that misbehaved.
title: 'friction: <short summary>'
labels: friction
---

> This repo is public. Leave out client names, personal paths, account IDs, and secrets.

## Component

Which skill, agent, hook, or guide? If a guide, name the recipe and step.

## How it was invoked

- [ ] Typed a slash command (`/lstk:<name>`)
- [ ] Claude chose it from a plain-words prompt
- [ ] Delegated to an agent
- [ ] A hook ran automatically

## Kind

- [ ] Wrong or poor output
- [ ] Did not trigger
- [ ] Triggered when it should not
- [ ] A hook blocked or allowed a call wrongly
- [ ] A guide is wrong or out of date

## Versions

- `lstk` / `lstk-guardrails`:
- Claude Code (`claude --version`):
- OS:

## Expected and actual

What did you expect, and what happened?

## Reproduction

The smallest prompt and repo state that reproduces it.

## Plain Claude Code check

Does the same prompt without the skill behave the same way? This separates a skill defect from model behavior.
