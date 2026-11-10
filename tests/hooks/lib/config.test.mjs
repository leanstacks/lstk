import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../../plugins/lstk-guardrails/hooks/lib/config.mjs';

const dirs = [];
function project(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'lstk-config-'));
  dirs.push(root);
  mkdirSync(path.join(root, '.claude'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(root, '.claude', name), content);
  }
  return root;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const load = (files) => {
  const warnings = [];
  const config = loadConfig(project(files), (m) => warnings.push(m));
  return { config, warnings };
};

describe('loadConfig', () => {
  it('returns empty lists when the file is missing', () => {
    const { config, warnings } = load({});
    expect(config).toEqual({ protectedPatterns: [], unprotectPatterns: [] });
    expect(warnings).toEqual([]);
  });

  it('reads both keys', () => {
    const { config } = load({
      'lstk.json': JSON.stringify({ protectedPatterns: ['secrets/'], unprotectPatterns: ['x'] }),
    });
    expect(config).toEqual({ protectedPatterns: ['secrets/'], unprotectPatterns: ['x'] });
  });

  it('merges the local file after the project file', () => {
    const { config } = load({
      'lstk.json': JSON.stringify({ protectedPatterns: ['a'] }),
      'lstk.local.json': JSON.stringify({ protectedPatterns: ['b'], unprotectPatterns: ['c'] }),
    });
    expect(config).toEqual({ protectedPatterns: ['a', 'b'], unprotectPatterns: ['c'] });
  });

  it('ignores unknown keys', () => {
    const { config, warnings } = load({ 'lstk.json': JSON.stringify({ other: 1 }) });
    expect(config.protectedPatterns).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('warns and ignores invalid JSON', () => {
    const { config, warnings } = load({ 'lstk.json': '{nope' });
    expect(config).toEqual({ protectedPatterns: [], unprotectPatterns: [] });
    expect(warnings[0]).toContain('not valid JSON');
  });

  it('warns and ignores a non-object file', () => {
    const { warnings } = load({ 'lstk.json': '[]' });
    expect(warnings[0]).toContain('must contain a JSON object');
  });

  it.each([
    ['not an array', { protectedPatterns: 'x' }],
    ['non-string entry', { protectedPatterns: [1] }],
    ['empty entry', { protectedPatterns: [''] }],
  ])('warns and ignores a key with the wrong type (%s)', (_n, json) => {
    const { config, warnings } = load({ 'lstk.json': JSON.stringify(json) });
    expect(config.protectedPatterns).toEqual([]);
    expect(warnings[0]).toContain('array of non-empty strings');
  });

  it('keeps a valid key when the other key is invalid', () => {
    const { config } = load({
      'lstk.json': JSON.stringify({ protectedPatterns: 7, unprotectPatterns: ['ok'] }),
    });
    expect(config.unprotectPatterns).toEqual(['ok']);
  });

  it('drops negated patterns with a warning', () => {
    const { config, warnings } = load({
      'lstk.json': JSON.stringify({ protectedPatterns: ['!keep', 'real'] }),
    });
    expect(config.protectedPatterns).toEqual(['real']);
    expect(warnings[0]).toContain('negation is not supported');
  });
});
