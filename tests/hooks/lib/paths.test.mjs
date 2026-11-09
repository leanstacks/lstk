import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  matchPattern,
  realpathDeepest,
  relativeTo,
  resolveTarget,
} from '../../../plugins/lstk-guardrails/hooks/lib/paths.mjs';

const dirs = [];
const tmp = () => {
  const d = mkdtempSync(path.join(tmpdir(), 'lstk-paths-'));
  dirs.push(d);
  return realpathDeepest(d);
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('matchPattern', () => {
  it.each([
    ['.env', '.env', true],
    ['.env', 'apps/api/.env', true],
    ['.env', '.environment.ts', false],
    ['.env', '.env.local', false],
    ['.env.*', '.env.local', true],
    ['.env.*', 'a/b/.env.production', true],
    ['.env.*', '.env', false],
    ['package-lock.json', 'sub/package-lock.json', true],
    ['package-lock.json', 'package-lock.json.bak', false],
    ['.git/', '.git/config', true],
    ['.git/', 'a/.git/hooks/pre-commit', true],
    ['.git/', '.git', false],
    ['.git/', '.github/workflows/ci.yml', false],
    ['.git/', 'foo.git/readme.md', false],
    ['*.pem', 'certs/server.pem', true],
    ['*.pem', 'certs/server.pem.txt', false],
    ['secrets/', 'secrets/a.txt', true],
    ['secrets/', 'x/secrets/a.txt', true],
    ['secrets/', 'secrets', false],
    ['config/prod.json', 'config/prod.json', true],
    ['config/prod.json', 'x/config/prod.json', false],
    ['/config/prod.json', 'config/prod.json', true],
    ['config/*.json', 'config/a.json', true],
    ['config/*.json', 'config/sub/a.json', false],
    ['config/**', 'config/sub/a.json', true],
    ['**/private/', 'a/b/private/k', true],
    ['file?.txt', 'file1.txt', true],
    ['file?.txt', 'file10.txt', false],
    ['a+b.txt', 'a+b.txt', true],
    ['a+b.txt', 'aab.txt', false],
    ['', 'anything', false],
  ])('pattern %j on %j is %s', (pattern, rel, expected) => {
    expect(matchPattern(pattern, rel)).toBe(expected);
  });
});

describe('resolveTarget', () => {
  it('collapses .. and normalizes backslashes', () => {
    const root = tmp();
    expect(resolveTarget('src/../.env', root).lexical).toBe(path.join(root, '.env'));
    expect(resolveTarget('a\\b\\.env', root).lexical).toBe(path.join(root, 'a', 'b', '.env'));
  });

  it('resolves the parent of a file that does not exist yet', () => {
    const root = tmp();
    mkdirSync(path.join(root, 'real'));
    symlinkSync('real', path.join(root, 'link'));
    expect(resolveTarget('link/new.txt', root).real).toBe(path.join(root, 'real', 'new.txt'));
  });

  it('follows a symlink to an existing file', () => {
    const root = tmp();
    writeFileSync(path.join(root, '.env'), '');
    symlinkSync('.env', path.join(root, 'alias'));
    expect(resolveTarget('alias', root).real).toBe(path.join(root, '.env'));
  });

  it('follows a dangling symlink to its target', () => {
    const root = tmp();
    symlinkSync('.env', path.join(root, 'alias'));
    expect(resolveTarget('alias', root).real).toBe(path.join(root, '.env'));
  });

  it('does not loop on a symlink cycle', () => {
    const root = tmp();
    symlinkSync('b', path.join(root, 'a'));
    symlinkSync('a', path.join(root, 'b'));
    expect(() => resolveTarget('a', root)).not.toThrow();
  });
});

describe('relativeTo', () => {
  it('returns a posix relative path inside the root', () => {
    expect(relativeTo('/p', '/p/a/b.txt')).toBe('a/b.txt');
  });

  it('returns the absolute path outside the root', () => {
    expect(relativeTo('/p', '/other/.env')).toBe('/other/.env');
    expect(relativeTo('/p', '/x')).toBe('/x');
  });
});
