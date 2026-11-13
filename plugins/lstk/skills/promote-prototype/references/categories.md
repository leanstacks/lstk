# Gap categories

Checklist for `promote-prototype`. For each check, record what production usually needs, what the prototype has (cited), and the gap. Record only checks that surface a real gap. The repo's own standards win over this list.

## Core categories (always checked)

### tests

- Are there unit tests for logic beyond rendering or the happy path? Cite the test files and what they cover.
- Are error paths, edge cases, and boundary inputs tested?
- Is there any integration or contract test against the real boundary that the prototype faked?
- Is there a test command in CI? A prototype usually has none.

### auth

- Is there authentication on every entry point (routes, handler events)? Look for a stub, a hard-coded identity, or a shared secret.
- Is there authorization (roles, ownership checks) for each action?
- Are sessions, tokens, and secrets handled outside the code? Report a hardcoded secret by location and kind only.

### error-handling

- Are failures from each faked boundary handled (timeouts, empty results, malformed input, partial failure)?
- Are errors returned in a consistent shape, without leaking internals?
- Are retries, idempotency, and validation present where the real boundary needs them?

### iac

- Is there infrastructure code at all? A prototype should not have deployable IaC, so absence is usually a gap of its own.
- What would a deploy need: resources, permissions, configuration, environments? Use `PROTOTYPE.md` `Not covered` as a starting list.
- Is configuration separated from code (environment, parameters), with no account IDs or credentials in the repo?

### observability

- Is there structured logging with a correlation id? Cite `console.log` use as the evidence.
- Are there metrics, traces, and alarms for the paths that matter?
- Can an operator tell a failure from a slow success?

## Conditional categories (only with a stated reason)

State the reason in `Scope and sources`, for example "`PROTOTYPE.md` lists personal data in fixtures" or "AGENTS.md requires a runbook".

### security

- Input validation at the boundary, output encoding, dependency health, and secrets handling beyond the `auth` checks. Hand off to `threat-model` for the full analysis.

### data

- Real persistence: schema, migrations, backups, retention, and data that was faked or invented. Check that fixtures hold no real data.

### ops

- CI/CD, environment configuration, release process, runbooks, and ownership. Check whether `prototypes/<name>/` sits under the repo's CI, workspaces, or ignore files.

### performance

- Load, latency, and size expectations the prototype never measured. Only when the repo or `PROTOTYPE.md` states a target.

## Sizing hints

- A missing test file for existing logic is usually `S` or `M`.
- A real auth integration is usually `XL` when it passes through every layer, `L` for a single entry point.
- The first IaC for a prototype is usually `XL`. Adding one more resource to existing IaC is `M`.
- Replacing one faked boundary with the real client is `M`, or `L` when it needs a design decision.
