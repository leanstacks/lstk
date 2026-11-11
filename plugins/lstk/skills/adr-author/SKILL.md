---
name: adr-author
description: Writes and maintains Markdown Architecture Decision Records (ADRs) in the target repo, following the repo's existing ADR convention or MADR-style in docs/adr/ when there is none. Use when the user says "write an ADR", "record this decision", "document why we chose X", or "supersede ADR N". Not for comparing options (tech-eval) or explaining why a repo is built a certain way (repo-onboarding).
---

# ADR Author

Records a decision that has been made. An ADR captures the context, the choice, and the consequences. It never invents the choice.

## Precedence rule

The repo's existing ADR convention, `AGENTS.md`, `CLAUDE.md`, and tool config win. Use the MADR-style default below only when the repo has no ADRs. Apply the `stack-profile` skill only for stack facts the repo does not state, and never present a default as a decision the team made.

## Workflow

### Phase 0: Detect the convention

Look for `docs/adr/`, `docs/decisions/`, `adr/`, `doc/adr/`, an `adr-tools` (`.adr-dir`) or `log4brains` config, and an index (`README.md` or `index.md`) in the directory. Read two or three existing records and note:

- the format (MADR, Nygard, or other), heading names, and status vocabulary;
- the file naming and numbering scheme (for example `0007-use-sqs.md`);
- how the index lists records;
- the language and tone.

If a convention exists, follow it exactly, including its template. If there is none, use the default: MADR-style in `docs/adr/`, files named `NNNN-kebab-title.md`, an index in `docs/adr/README.md`, and the template in [references/adr-template.md](references/adr-template.md). Tell the user which convention you are using.

### Phase 1: Gather context

Establish the decision, the forces behind it, the options considered, and who decided. Take options and evidence from a `tech-eval` result in the conversation or from `docs/research/` when present, and keep its source keys. Read `AGENTS.md` and existing ADRs for related decisions to link.

**If the decision itself is unclear, ask. Do not write an ADR for a decision the user has not made.** If the user is still choosing, offer `tech-eval` and stop.

### Phase 2: Confirm, then write

1. Pick the next number from the existing files (highest number plus one, zero-padded to the repo's width).
2. Propose the **title** (a short noun phrase naming the decision) and the **status**, and confirm both before writing. Use `proposed` unless the user says the decision is accepted.
3. Write the record. Mark anything you could not establish as `TODO(verify)` rather than guessing.
4. Update the index. Add the new record, and update the status of any record it supersedes.
5. Report the file path, the status, and the open items.

Do not commit. Leave that to the user.

## Lifecycle rules

- **Statuses:** `proposed`, `accepted`, `deprecated`, `superseded by NNNN`. Follow the repo's vocabulary if it differs.
- **Never edit an accepted ADR's decision text.** To change a decision, write a new record that supersedes it, and change only the old record's status line (and add a link to the new one) and its index entry.
- **Link related records** by relative path, in both directions where a record supersedes or amends another.
- Keep one decision per record. Split a record that holds two.
- Consequences list both the good and the bad. An ADR with no downsides is incomplete.

## Diagrams

Include a Mermaid diagram only when it clarifies a structural or flow decision. Most ADRs need none. Keep it small and put it in the Context or Decision section. See [references/mermaid-examples.md](references/mermaid-examples.md).

## Rules

- The record states the decision as made, in the present tense ("We use SQS for ...").
- Do not add facts the user did not give (consumers, deciders, alternatives). Mark them `TODO(verify)`. Consequences you infer go in the record, and you tell the user to review them.
- Cite sources for factual claims taken from research, by key or URL.
- No secrets, client names, personal paths, or credentials.

## Related skills

- `tech-eval` compares options before a decision. Offer it when the user has not chosen yet.
- `solution-outline` lists key decisions that each become an ADR. Take the options it noted as input.
- `stack-profile` supplies the default stack where the repo is silent.
