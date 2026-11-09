---
name: init
description: Bootstraps lstk guardrail permission rules (deny and ask, optional allow) into Claude Code settings at user or project scope. Use when installing lstk-guardrails or when the user asks to set up, apply, or refresh guardrail settings.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/merge-settings.mjs" *)
---

# lstk-guardrails init

Merge the lstk-guardrails permission rules into a Claude Code `settings.json`. The script does the work. Do not edit
settings files by hand.

The hooks in this plugin are already active once it is installed. This skill adds the second layer: `deny` and `ask`
permission rules in settings, which still apply if a hook fails open.

## Steps

1. **Ask the scope.** Offer two choices:
   - **user**: `~/.claude/settings.json`. Applies to every project on this machine. Once per machine.
   - **project**: `.claude/settings.json` in this project. Committed, so the whole team gets the rules.
2. **Ask about the opt-in `convenience` rules.** These are `allow` rules for common read-only git, `gh`, and
   `cdk synth` / `cdk diff` commands. Default to no.
3. **Preview with a dry run.** Run the script with `--dry-run`, then show the user the output, including any conflict
   report.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/merge-settings.mjs" --scope <user|project> --project-dir "${CLAUDE_PROJECT_DIR}" --dry-run
   ```

   Add `--include-convenience` if the user chose the convenience rules. `--project-dir` is only used for project scope.

4. **Apply on confirmation.** Ask the user to confirm. Then run the same command without `--dry-run`.
5. **Report what changed.** Say which rules were added, and that the original file was kept as `settings.json.bak`. If
   the output says "No changes", say the rules were already present.
6. **Give the follow-up notes.**
   - If an old `hooks` block for `protect-files` or `block-cdk-mutate` exists in `~/.claude/settings.json`, remove it.
     Otherwise the hooks run twice.
   - Run `/reload-plugins` or restart Claude Code if the rules do not take effect.
   - Suggest adding `.claude/lstk.local.json` to `.gitignore` if the user wants personal protected-file overrides.

## Contract

- The script only adds entries to `permissions.deny`, `permissions.ask`, and (opt-in) `permissions.allow`.
- It never removes or reorders existing entries, and never touches `hooks`, `model`, `theme`, or any other key.
- It is idempotent. Running it again reports "No changes".
- It refuses to write if the existing file is not valid JSON or has the wrong types, and tells the user why.
- If the output lists conflicts, an existing `allow` rule is covered by a `deny` rule. Deny wins at runtime. The check is
  best effort.
