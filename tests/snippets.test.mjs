import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../plugins/lstk-guardrails/snippets/${name}.json`, import.meta.url), 'utf8'));
const raw = (name) =>
  readFileSync(new URL(`../plugins/lstk-guardrails/snippets/${name}.json`, import.meta.url), 'utf8');

const snippets = { baseline: load('baseline'), convenience: load('convenience') };
const EXPECTED_ARRAYS = { baseline: ['deny', 'ask'], convenience: ['allow'] };

/** Does a permission rule, treated as a glob over rule text, cover the other rule's text? */
function covers(rule, other) {
  if (rule === other) return true;
  const re = new RegExp(
    `^${rule
      .split('*')
      .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
  );
  return re.test(other);
}

describe.each(Object.keys(snippets))('%s.json', (name) => {
  const snippet = snippets[name];

  it('has only the permissions key', () => {
    expect(Object.keys(snippet)).toEqual(['permissions']);
  });

  it('has only the expected rule arrays', () => {
    expect(Object.keys(snippet.permissions)).toEqual(EXPECTED_ARRAYS[name]);
  });

  it('holds arrays of non-empty, trimmed strings with no duplicates', () => {
    for (const list of Object.values(snippet.permissions)) {
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const rule of list) {
        expect(rule).toBeTypeOf('string');
        expect(rule.trim()).toBe(rule);
        expect(rule.length).toBeGreaterThan(0);
      }
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('has no personal paths', () => {
    expect(raw(name)).not.toMatch(/\/home\/|\/Users\/|C:\\|@moduscreate/i);
  });

  it('is formatted with two spaces and a trailing newline', () => {
    expect(raw(name)).toBe(`${JSON.stringify(snippet, null, 2)}\n`);
  });
});

describe('snippet rules together', () => {
  const { deny, ask } = snippets.baseline.permissions;
  const { allow } = snippets.convenience.permissions;

  it('does not repeat a rule across deny, ask, and allow', () => {
    const all = [...deny, ...ask, ...allow];
    expect(new Set(all).size).toBe(all.length);
  });

  it('has no allow rule that a deny rule also matches', () => {
    for (const a of allow) {
      for (const d of deny) expect(covers(d, a), `${d} covers ${a}`).toBe(false);
    }
  });

  it('has no ask rule that a deny rule also matches', () => {
    for (const a of ask) {
      for (const d of deny) expect(covers(d, a), `${d} covers ${a}`).toBe(false);
    }
  });

  it('denies the CDK mutating subcommands in both forms, and asks on bootstrap', () => {
    for (const sub of ['deploy', 'destroy', 'watch']) {
      expect(deny).toContain(`Bash(*cdk ${sub}*)`);
      expect(deny).toContain(`Bash(*cdk * ${sub}*)`);
    }
    expect(ask).toContain('Bash(*cdk bootstrap*)');
    expect(ask).toContain('Bash(*cdk * bootstrap*)');
  });

  it('keeps model, theme, defaultMode, and hooks out of the snippets', () => {
    const text = JSON.stringify(snippets);
    for (const key of ['model', 'theme', 'defaultMode', 'hooks']) {
      expect(text).not.toContain(`"${key}"`);
    }
  });
});
