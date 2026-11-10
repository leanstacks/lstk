import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PLUGIN_ROOT = fileURLToPath(new URL('../../plugins/lstk-guardrails/', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(PLUGIN_ROOT, 'hooks/hooks.json'), 'utf8'));

const groups = manifest.hooks.PreToolUse;
const handlers = groups.flatMap((g) => g.hooks);
const ROOT_VAR = '${CLAUDE_PLUGIN_ROOT}';

describe('hooks/hooks.json', () => {
  it('declares only PreToolUse hooks', () => {
    expect(Object.keys(manifest.hooks)).toEqual(['PreToolUse']);
  });

  it('registers protect-files for Edit|Write and block-cdk-mutate for Bash', () => {
    const byMatcher = Object.fromEntries(groups.map((g) => [g.matcher, g.hooks]));
    expect(Object.keys(byMatcher).sort()).toEqual(['Bash', 'Edit|Write']);
    expect(byMatcher['Edit|Write'].map((h) => h.args.at(-1))).toEqual([`${ROOT_VAR}/hooks/protect-files.mjs`]);
    expect(byMatcher.Bash.map((h) => h.args.at(-1))).toEqual([`${ROOT_VAR}/hooks/block-cdk-mutate.mjs`]);
  });

  it.each(handlers.map((h) => [h.args.at(-1), h]))('%s is a safe exec-form command', (_s, h) => {
    expect(h.type).toBe('command');
    expect(h.command).toBe('node');
    expect(h.args).toHaveLength(1);
    expect(h.args[0].startsWith(`${ROOT_VAR}/`)).toBe(true);
    expect(JSON.stringify(h)).not.toContain('..');
    expect(h.timeout).toBeGreaterThan(0);
    expect(h.timeout).toBeLessThanOrEqual(30);
  });

  it('references scripts that exist in the plugin', () => {
    for (const h of handlers) {
      const file = path.join(PLUGIN_ROOT, h.args[0].replace(`${ROOT_VAR}/`, ''));
      expect(existsSync(file), file).toBe(true);
    }
  });

  it('does not block on hook failure, because the hooks fail open by design', () => {
    for (const h of handlers) expect(h.onFailure).toBeUndefined();
  });
});
