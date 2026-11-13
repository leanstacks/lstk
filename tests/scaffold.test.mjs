import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { evaluate } from '../plugins/lstk-guardrails/hooks/protect-files.mjs';
import { nameProblem, scaffold, ScaffoldError } from '../plugins/lstk/skills/prototype/scripts/scaffold.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/lstk/skills/prototype/scripts/scaffold.mjs', import.meta.url));
const tmpDirs = [];

function makeTarget() {
  const dir = mkdtempSync(path.join(tmpdir(), 'lstk-scaffold-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('nameProblem', () => {
  it.each(['demo', 'order-dashboard', 'a1', 'webhook-parser-2'])('accepts %s', (name) => {
    expect(nameProblem(name)).toBeNull();
  });

  it.each([
    ['', 'required'],
    [undefined, 'required'],
    ['Demo', 'kebab-case'],
    ['my_proto', 'kebab-case'],
    ['1demo', 'kebab-case'],
    ['demo-', 'kebab-case'],
    ['-demo', 'kebab-case'],
    ['a--b', 'kebab-case'],
    ['../x', 'kebab-case'],
    ['a/b', 'kebab-case'],
    ['a\\b', 'kebab-case'],
    ['.', 'kebab-case'],
    ['..', 'kebab-case'],
    ['x'.repeat(41), 'at most'],
  ])('rejects %j', (name, fragment) => {
    expect(nameProblem(name)).toContain(fragment);
  });
});

describe('scaffold', () => {
  it.each([
    ['web', ['PROTOTYPE.md', 'package.json', '.gitignore', 'src/App.tsx']],
    ['lambda', ['PROTOTYPE.md', 'package.json', '.gitignore', 'src/handler.ts', 'events/sample.json']],
  ])('copies the %s template', (shape, expected) => {
    const target = makeTarget();
    const result = scaffold({ shape, name: 'demo-proto', target, date: '2026-01-02' });
    expect(result.shape).toBe(shape);
    expect(result.directory).toBe(path.join('prototypes', 'demo-proto'));
    expect(result.files).toEqual(expect.arrayContaining(expected));
    expect(result.files).not.toContain('_gitignore');
    for (const rel of result.files) {
      expect(() => readFileSync(path.join(target, result.directory, rel))).not.toThrow();
    }
  });

  it('substitutes the name and the date, leaving no placeholders', () => {
    const target = makeTarget();
    const { files, directory } = scaffold({ shape: 'web', name: 'demo-proto', target, date: '2026-01-02' });
    const text = (rel) => readFileSync(path.join(target, directory, rel), 'utf8');
    expect(JSON.parse(text('package.json')).name).toBe('demo-proto');
    expect(text('PROTOTYPE.md')).toContain('# demo-proto');
    expect(text('PROTOTYPE.md')).toContain('Scaffolded 2026-01-02');
    for (const rel of files) expect(text(rel), rel).not.toMatch(/\{\{(name|date)\}\}/);
  });

  it('defaults the date to today', () => {
    const target = makeTarget();
    const { directory } = scaffold({ shape: 'lambda', name: 'demo', target });
    expect(readFileSync(path.join(target, directory, 'PROTOTYPE.md'), 'utf8')).toMatch(/Scaffolded \d{4}-\d{2}-\d{2} /);
  });

  it('writes only inside prototypes/<name>/', () => {
    const target = makeTarget();
    writeFileSync(path.join(target, 'package.json'), '{"name":"root"}');
    scaffold({ shape: 'web', name: 'demo', target });
    expect(readFileSync(path.join(target, 'package.json'), 'utf8')).toBe('{"name":"root"}');
  });

  it('accepts an existing empty directory', () => {
    const target = makeTarget();
    mkdirSync(path.join(target, 'prototypes', 'demo'), { recursive: true });
    expect(() => scaffold({ shape: 'web', name: 'demo', target })).not.toThrow();
  });

  it('refuses a non-empty directory and leaves it untouched, on every attempt', () => {
    const target = makeTarget();
    const dir = path.join(target, 'prototypes', 'demo');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'mine.txt'), 'keep');
    for (let i = 0; i < 2; i++) {
      expect(() => scaffold({ shape: 'web', name: 'demo', target })).toThrow(/already exists and is not empty/);
    }
    expect(readFileSync(path.join(dir, 'mine.txt'), 'utf8')).toBe('keep');
  });

  it('refuses a second scaffold of the same name', () => {
    const target = makeTarget();
    scaffold({ shape: 'web', name: 'demo', target });
    expect(() => scaffold({ shape: 'lambda', name: 'demo', target })).toThrow(ScaffoldError);
  });

  it('refuses a file where the prototype directory should be', () => {
    const target = makeTarget();
    mkdirSync(path.join(target, 'prototypes'));
    writeFileSync(path.join(target, 'prototypes', 'demo'), 'a file');
    expect(() => scaffold({ shape: 'web', name: 'demo', target })).toThrow(/already exists/);
  });

  it('refuses a prototypes entry that is a symlink', () => {
    const target = makeTarget();
    const elsewhere = makeTarget();
    symlinkSync(elsewhere, path.join(target, 'prototypes'));
    expect(() => scaffold({ shape: 'web', name: 'demo', target })).toThrow(/not a plain directory/);
    expect(() => readFileSync(path.join(elsewhere, 'demo', 'package.json'))).toThrow();
  });

  it.each(['../x', '..', 'a/b', '/etc/passwd', 'Bad Name'])('rejects the traversal or invalid name %j', (name) => {
    const target = makeTarget();
    expect(() => scaffold({ shape: 'web', name, target })).toThrow(ScaffoldError);
  });

  it.each(['', 'node', 'WEB', undefined])('rejects the shape %j', (shape) => {
    expect(() => scaffold({ shape, name: 'demo', target: makeTarget() })).toThrow(/shape must be one of/);
  });

  it('rejects a missing target', () => {
    const missing = path.join(makeTarget(), 'nope');
    expect(() => scaffold({ shape: 'web', name: 'demo', target: missing })).toThrow(/not an existing directory/);
    expect(() => scaffold({ shape: 'web', name: 'demo', target: '' })).toThrow(/target is required/);
  });
});

describe('scaffold output and the protect-files hook', () => {
  it.each(['web', 'lambda'])('no %s file is blocked by a default protected pattern', (shape) => {
    const target = makeTarget();
    const { files, directory } = scaffold({ shape, name: 'demo', target });
    for (const rel of files) {
      const file_path = path.join(target, directory, rel);
      const result = evaluate({ cwd: target, tool_name: 'Write', tool_input: { file_path } }, { env: {} });
      expect(result.decision, `${rel}: ${result.reason ?? ''}`).toBe('allow');
    }
  });

  it.each(['web', 'lambda'])('the %s template ships no lockfile, env file, or ../ reference', (shape) => {
    const { files, directory } = scaffold({ shape, name: 'demo', target: makeTarget() });
    expect(directory).toBeTruthy();
    for (const rel of files) {
      expect(rel).not.toMatch(/(^|\/)(package-lock\.json|\.env(\..*)?)$/);
    }
  });
});

describe('scaffold CLI', () => {
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('prints the created files as JSON', () => {
    const target = makeTarget();
    const out = run('--shape', 'lambda', '--name', 'demo', '--target', target);
    expect(out.status).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json).toMatchObject({ shape: 'lambda', name: 'demo', directory: path.join('prototypes', 'demo') });
    expect(json.files).toContain('PROTOTYPE.md');
  });

  it.each([
    [['--shape', 'web', '--name', '../x', '--target', '.'], /kebab-case/],
    [['--shape', 'cdk', '--name', 'demo', '--target', '.'], /shape must be one of/],
    [['--shape', 'web', '--name', 'demo'], /target is required/],
    [['--shape'], /usage/],
    [['--bogus', 'x'], /usage/],
    [[], /shape must be one of/],
  ])('fails with a message for %j', (args, message) => {
    const out = run(...args);
    expect(out.status).toBe(1);
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatch(message);
  });

  it('fails on an existing non-empty directory', () => {
    const target = makeTarget();
    expect(run('--shape', 'web', '--name', 'demo', '--target', target).status).toBe(0);
    const again = run('--shape', 'web', '--name', 'demo', '--target', target);
    expect(again.status).toBe(1);
    expect(again.stderr).toMatch(/already exists and is not empty/);
  });
});
