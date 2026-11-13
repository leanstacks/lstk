# New projects

Recipes for designing and starting a new system.

> Last verified against `lstk` 0.4.0 and Claude Code 2.1.323 on 2026-11-13.

A new project differs from an existing one at the **front** of the loop. An existing project starts from discovery
(`repo-onboarding`, `agents-md-author`). A new project starts from design (`solution-outline`, `tech-eval`,
`adr-author`). Once code is being written, the loop is the same, so this guide ends by pointing back to the
[shared implementation loop](existing-projects.md#shared-implementation-loop) instead of repeating it.

**The honest limit.** lstk has **no skill that scaffolds a production repo**. `prototype` builds a throwaway spike, and
that is all. The closest path today is in [Start a repo with the default stack](#start-a-repo-with-the-default-stack).

The legend for the step tags (`[type it]`, `[say it]`, `[delegate it]`, `[plain Claude Code]`) is in the
[lifecycle map](lifecycle.md#how-to-invoke-each-piece). Example prompts use the fictional Example Orders system.

## Create a solution design

**When to use it.** You have requirements and need a reviewable design before anyone writes code.

**Steps.**

1. **Write the requirements.** A few paragraphs: what the system does, how many users, the constraints (budget, team,
   deadline, existing systems). Put them in the prompt, or in a file you point to. [plain Claude Code]
2. **Outline the solution.** Run `solution-outline`. It returns a draft: requirements and assumptions, components with
   a diagram, key decisions with their options, risks, and a staffing and effort sketch as ranges. [say it]
3. **Compare the open choices.** For each key decision that needs evidence, run `tech-eval`. It runs `researcher`
   agents in parallel and returns a sourced trade-off matrix. [say it]
4. **Record each decision you take.** Run `adr-author` once per decision. It writes the ADR (Architecture Decision
   Record) and updates the index. It will not write one for a decision you have not made. [say it]
5. **Review the draft.** Run `architecture-review` on the design doc. It returns trade-offs to weigh, not verdicts. See
   [Review a design](review-and-hardening.md#review-a-design). [type it]
6. **Check trust boundaries.** If the design has users, data stores, or external callers, run `threat-model` on it.
   [type it]
7. **Have a human review.** The outline is speculative and marked as a draft. A person reviews it before work starts.

**Prompt.**

```text
Step 2:
Outline a solution with the solution-outline skill. Requirements: <requirements>. Constraints: <team size, deadline,
budget, existing systems>. List your assumptions and ask me about the ones that would change the design most. Write the
result to docs/design/<name>.md.
```

```text
Step 3:
Compare <option A>, <option B>, and <option C> for <decision> with the tech-eval skill. Criteria that matter most:
<cost, team skills, operational load>.
```

```text
Step 4, after you choose:
Write an ADR for the decision to use <option>. Reasons: <why>. Link the tech-eval result.
```

```text
Step 5:
/lstk:architecture-review
```

Then name the design doc when it asks.

```text
Step 6:
/lstk:threat-model
```

**Produces.** Files you commit:

- `docs/design/<name>.md`. `solution-outline` writes it only when you ask, as above. Keep the draft banner until a
  human has reviewed it.
- `docs/research/<topic>.md` from `tech-eval`, only when you ask for it.
- `docs/adr/NNNN-<title>.md` and the `docs/adr/README.md` index, or your repo's own ADR convention.
- `docs/reviews/architecture-review-<name>.md` and `docs/threat-models/<name>.md`. Committing these is a team choice.

**Skip it when.**

- Step 3: the stack is already decided. The repo's `AGENTS.md` wins, and `stack-profile` supplies the defaults only
  where it is silent.
- Step 4: you have not decided yet. Run `tech-eval` first and decide as a person.
- Steps 5 and 6: the design is a small internal tool with no sensitive data. Run them for anything a client will rely
  on.

**What lstk adds here.** `solution-outline` structures the draft and keeps estimates honest (ranges, stated
assumptions). `tech-eval` ties every claim in the matrix to a source and marks gaps as "not found". `adr-author` keeps
decisions in one convention. `architecture-review` and `threat-model` check the draft.

**What is plain Claude Code here.** Gathering the requirements and deciding. No skill decides for you. Each skill
lists options and trade-offs and leaves the choice to you.

**Example.** [solution-outline](../examples/solution-outline.md), [tech-eval](../examples/tech-eval.md),
[adr-author](../examples/adr-author.md), [architecture-review](../examples/architecture-review.md), and
[threat-model](../examples/threat-model.md).

## Start a repo with the default stack

**When to use it.** The design is settled and you want an empty repo that follows the default stack: TypeScript ESM,
Vitest, oxlint, Prettier, and, as the design needs, NestJS, Lambda, Vite and React, or CDK.

**The limit.** No lstk skill scaffolds a production repo. A scaffold skill would encode stack opinions and template
versions that age, so they are deferred until real use shows which one is worth maintaining. The proposals are tracked
in the backlog: <!-- ISSUE-SLOT: scaffold skills and backlog tracking issue, filled in Phase 7 -->the issue links are
added when the backlog is filed. Until then, Claude Code builds the skeleton.

**Steps.**

1. **Set the defaults.** `stack-profile` loads on its own when Claude needs stack defaults. Tell Claude to use it, and
   say which parts of the stack apply. The defaults cover the language, test runner, linter, formatter, and
   infrastructure style. [say it]
2. **Create the skeleton.** Ask Claude to create the repo layout, the package files, and one script that runs every
   quality gate, such as `npm run check`. Use plan mode first and read the plan. [plain Claude Code]
3. **Run the gate.** Run `npm run check`. A new repo should pass it before any feature code exists. [plain Claude Code]
4. **Document the repo.** Run `agents-md-author`. It records the commands and conventions you just set up in
   `AGENTS.md`, so every later session starts grounded. [say it]
5. **Verify the setup.** Run `local-setup-author`. It writes `docs/LOCAL_SETUP.md` and checks that the steps work from a
   fresh clone. [say it]
6. **Commit and open the first PR.** Use `commit-messages`, then `create-pull-request`. [say it, then type it]

**Prompt.**

```text
Step 1:
Use the stack-profile defaults for this repo: <the parts that apply, for example TypeScript ESM, Vitest, oxlint,
Prettier, and a NestJS service>. Where I say otherwise, I win.
```

```text
Step 2, in plan mode:
Plan the repo skeleton for <system>. Include the folder layout, the package files, the tsconfig, the lint and format
config, one example test, and a single npm run check command that runs lint, format check, and tests. Do not edit
anything yet.
```

```text
Step 4:
Create an AGENTS.md for this repo with the agents-md-author skill.
```

```text
Step 5:
Create docs/LOCAL_SETUP.md with the local-setup-author skill and verify each step from a clean checkout.
```

**Produces.** The repo skeleton, `AGENTS.md`, and `docs/LOCAL_SETUP.md`. Commit all of them.

**Skip it when.**

- Step 1: the repo is in an existing monorepo that already states its stack. Its `AGENTS.md` wins.
- Step 5: you are the only developer and the repo has a single command to run.

**What lstk adds here.** `stack-profile` for the defaults. `agents-md-author` and `local-setup-author` document and
verify what you built. The guardrail hooks stay on, and `.env` and lockfiles are protected from the first commit.

**What is plain Claude Code here.** The skeleton itself. Treat the generated files as a first draft. Check the versions
of every dependency it pins before you rely on it.

**Example.** The skill outputs for [adr-author](../examples/adr-author.md) and the design recipes above show the
documents. There is no example of a scaffolded repo, because no skill makes one.

## Prototype first, then promote

**When to use it.** You want to learn something or show something quickly, and you are willing to throw the code away.
Typical cases are a question about feasibility, a demo for a client conversation, or a UI to react to.

**Steps.**

1. **Prototype.** Run `prototype` with the idea. It asks once for the purpose, the shape (a Vite and React app with a
   mocked API, or one Lambda handler), and a name. It scaffolds `prototypes/<name>/` and writes an honest
   `PROTOTYPE.md`. [type it]
2. **Run it yourself.** Follow `How to run` in `PROTOTYPE.md`. The skill does not install dependencies or start
   servers, so "it runs" is unverified until you run it. [plain Claude Code]
3. **Decide.** Did the prototype answer the question? If yes, record the decision with `adr-author`. If not, discard
   the directory. [say it]
4. **Find the gaps.** If the idea survives, run `promote-prototype`. It writes a cited gap list against production
   expectations (tests, auth, error handling, infrastructure as code, observability) with relative sizes from S to XL.
   It never edits the prototype. [type it]
5. **Turn the gaps into scope.** Give the gap list to `solution-outline` to get an estimate as ranges. [say it]
6. **Build for real.** Start a new repo or module. Follow
   [Start a repo with the default stack](#start-a-repo-with-the-default-stack) or the
   [shared loop](existing-projects.md#shared-implementation-loop). Do not grow the prototype into the product.

**Prompt.**

```text
Step 1:
/lstk:prototype
```

Then answer its one question: the purpose, the shape, and the name.

```text
Step 4:
/lstk:promote-prototype
```

Then name `prototypes/<name>/` when it asks.

```text
Step 5:
Estimate what it would take to productionize prototypes/<name>/ with the solution-outline skill. Use
prototypes/<name>/PROMOTION-GAPS.md as the input.
```

**Produces.** `prototypes/<name>/` with `PROTOTYPE.md`, and `prototypes/<name>/PROMOTION-GAPS.md` after step 4. Whether
to commit them is a team choice. A prototype is **throwaway by default**, so many teams keep it on a branch or add it
to an ignore file. The skill never edits root config, so that choice and its setup are yours. A prototype is never
deployed. `prototype` writes no infrastructure code meant to deploy and never runs a deploy command.

**Skip it when.**

- Step 4: you are discarding the prototype.
- Step 5: the gap list is short enough to plan from directly.
- The whole recipe: the question can be answered by reading. Run `tech-eval` instead.

**What lstk adds here.** The templates that make a spike quick, the plainly fake data, and the `PROTOTYPE.md` that says
what is faked. `promote-prototype` turns a vague worry ("is this production ready") into a cited list, and says what it
could not check. Static reading only: it does not run the prototype or its tests.

**What is plain Claude Code here.** Running the prototype and judging whether it answered your question. Only the `web`
and `lambda` shapes exist. For a NestJS service or a CLI, ask Claude Code directly, outside the skill.

**Example.** [prototype](../examples/prototype.md) and [promote-prototype](../examples/promote-prototype.md).

## Implement features in a new project

**When to use it.** The repo exists, and you are now building the system feature by feature.

**Steps.** Run the [shared implementation loop](existing-projects.md#shared-implementation-loop) for each feature, and
the [add a feature](existing-projects.md#add-a-feature) recipe when a feature needs its own design. The prompts are the
same. Three things differ in a new project:

1. **There is no history to learn from, so write `AGENTS.md` early.** In an existing repo Claude can infer conventions
   from the code. Here there is little code, so state them. Run `agents-md-author` as soon as the skeleton passes
   `npm run check`, and update it when a convention changes. [say it]
2. **Decisions are fresh, so use `adr-author` more.** Every early choice (data store, auth, deployment shape) is one a
   new teammate will ask about later. Record each in an ADR when you make it. [say it]
3. **There is no CI baseline yet, so set up `npm run check` first.** Before the first feature, make one command run lint,
   format, and tests, and run the same command in CI. The loop's Check step and `code-reviewer` both lean on it.
   [plain Claude Code]

**Prompt.**

```text
Early, after the skeleton passes the checks:
Create an AGENTS.md for this repo with the agents-md-author skill.
```

```text
Whenever you settle a choice:
Write an ADR for the decision to use <option>. Reasons: <why>.
```

For everything else, reuse the prompts in the [shared loop](existing-projects.md#shared-implementation-loop).

**Produces.** `AGENTS.md`, ADRs, and the loop's commits and pull requests. All are committed.

**Skip it when.** Steps 1 and 3 are done once, and then they are over. Step 2 stays on for any decision that is costly
to reverse.

**What lstk adds here.** The same as the loop: `code-reviewer`, `commit-messages`, and `create-pull-request`, plus
`agents-md-author` and `adr-author` to hold the conventions and decisions the repo has no history for.

**What is plain Claude Code here.** All of the implementation, as in the loop.

**Example.** [code-reviewer example](../examples/code-reviewer.md) for the review report, and
[adr-author](../examples/adr-author.md) for a recorded decision.

## Who does what

Architects mostly use the design recipes, engineers mostly use the loop, and both use the review recipes.

| Role      | Usually uses                                                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architect | [Create a solution design](#create-a-solution-design), [Prototype first, then promote](#prototype-first-then-promote), and [Review a design](review-and-hardening.md#review-a-design)                           |
| Engineer  | [Start a repo with the default stack](#start-a-repo-with-the-default-stack), the [shared loop](existing-projects.md#shared-implementation-loop), and [Review a change](review-and-hardening.md#review-a-change) |
| Both      | [Harden a service](review-and-hardening.md#harden-a-service) and [Before a release or client handoff](review-and-hardening.md#before-a-release-or-client-handoff)                                               |
