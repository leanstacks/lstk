# Milestone plan template

Use this structure for a `milestone` plan: a high-level roadmap. Each milestone is later detailed as its own phase plan (`PLAN-<id>-M<n>.md`). Keep every heading, in this order. Replace every placeholder. A section with nothing to say says "None."

Effort is a relative range with assumptions, never a promise.

````markdown
# PLAN-<id>: <title>

**Status:** Draft
**Source:** <issue, brief, or design doc, with a link or path>
**Purpose:** <why this roadmap exists, in one or two sentences>
**Estimates basis:** <relative sizes or ranges, and the assumptions behind them>

---

## Ground rules (apply to every milestone)

- <rule: stack, checks, commit convention, review gate>

---

## Milestone overview

| #   | Milestone | Size  | Effort range | Depends on | Review gate   |
| --- | --------- | ----- | ------------ | ---------- | ------------- |
| M0  | <name>    | <S-L> | <range>      | none       | <who or what> |

```mermaid
flowchart LR
    M0 --> M1
```

**Parallelism:** <which milestones can run in parallel, or "None.">

---

## M0: <name>

**Goal:** <one sentence, verifiable>

**Scope**

- <item>

**Out of scope**

- <item>

**Dependencies:** <milestones or external inputs>

**Deliverables:** <artifacts produced>

**Exit criteria:** <observable conditions that close the milestone>

**Risks and spikes:** <risks, and any investigation to do first>

**Inputs for detailed planning:** <the files, issues, and decisions the phase plan for this milestone starts from>

---

## Cross-cutting risks and where they are handled

| Risk   | Handled in  |
| ------ | ----------- |
| <risk> | <milestone> |

## Open items to settle during detailed planning

- <item>

## How to use this plan

Each milestone becomes a phase plan, `PLAN-<id>-M<n>.md`, written with `/lstk:plan-author`. Start a phase plan from that milestone's section, the ground rules, and its inputs for detailed planning.
````

## Rules

- Sections, in order: title, header block (Status, Source, Purpose, Estimates basis), Ground rules, Milestone overview, one section per milestone, Cross-cutting risks and where they are handled, Open items to settle during detailed planning, How to use this plan.
- Each milestone has these parts, in order: **Goal**, **Scope**, **Out of scope**, **Dependencies**, **Deliverables**, **Exit criteria**, **Risks and spikes**, **Inputs for detailed planning**.
- The milestone gate is named **Exit criteria**.
- The overview table carries size, effort range, dependencies, and the review gate for every milestone. The diagram matches the Depends on column.
- Milestones are outcomes with a verifiable exit, not task lists. Task breakdown belongs in the phase plan.
