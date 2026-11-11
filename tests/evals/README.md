# Trigger evals

Each skill in `plugins/lstk/skills/` has one eval file, `<skill>.json`. The evals are documented prompts with expected
trigger outcomes. They need model access, so CI checks only their shape (`tests/evals.test.mjs`). Results of manual
runs are recorded in `RESULTS.md`.

## Format

```json
{
  "skill": "commit-messages",
  "prompts": [{ "id": "commit-messages-01", "prompt": "commit my changes", "shouldTrigger": true, "note": "Why." }]
}
```

- `skill` equals the skill directory name.
- Each set has at least 3 prompts, with both `shouldTrigger: true` and `false` cases. Include at least one near-miss,
  meaning a prompt that belongs to a sibling skill or is only superficially related.
- Ids are unique within the file. Prompts use neutral examples with no real project details.
- `create-pull-request` sets `disable-model-invocation: true`. Its only positive case is the explicit
  `/lstk:create-pull-request`. Natural-language requests are `false` because the model must not auto-pick the skill.

## Running an eval manually

1. Install the plugin in a scratch repo (`/plugin marketplace add ./`, then install `lstk@lstk`) and run `/reload-plugins`.
2. For each prompt, start a fresh session and send it. Note whether the skill was invoked.
3. Alternatively, use the `skill-creator` skill's description-optimization workflow with the prompts as the query set.
4. Record the date, Claude Code version, model, and per-skill pass count in `RESULTS.md`.

## Pass criteria

A prompt passes when the skill fires if and only if `shouldTrigger` is `true`. On a miss, fix the description first,
re-run, and note the change in `RESULTS.md`. Stop after two iterations per skill and record the remaining gap.
