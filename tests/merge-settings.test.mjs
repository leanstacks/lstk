import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MergeError,
  diffSettings,
  findConflicts,
  mergeSettings,
  run,
} from '../plugins/lstk-guardrails/scripts/merge-settings.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/lstk-guardrails/scripts/merge-settings.mjs', import.meta.url));
const SNIPPETS = path.join(path.dirname(SCRIPT), '..', 'snippets');
const baseline = JSON.parse(readFileSync(path.join(SNIPPETS, 'baseline.json'), 'utf8'));
const convenience = JSON.parse(readFileSync(path.join(SNIPPETS, 'convenience.json'), 'utf8'));

const dirs = [];
function tmp() {
  const d = mkdtempSync(path.join(tmpdir(), 'lstk-merge-'));
  dirs.push(d);
  return d;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function runCli(argv, io = {}) {
  const out = [];
  const err = [];
  const code = run(argv, { out: (s) => out.push(s), err: (s) => err.push(s), ...io });
  return { code, out: out.join('\n'), err: err.join('\n') };
}
const settingsPath = (root) => path.join(root, '.claude', 'settings.json');
const writeSettings = (root, content) => {
  mkdirSync(path.join(root, '.claude'), { recursive: true });
  writeFileSync(settingsPath(root), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
};
const readSettings = (root) => JSON.parse(readFileSync(settingsPath(root), 'utf8'));

describe('mergeSettings', () => {
  it('creates permissions when missing', () => {
    const merged = mergeSettings({}, [baseline]);
    expect(merged.permissions.deny).toEqual(baseline.permissions.deny);
    expect(merged.permissions.ask).toEqual(baseline.permissions.ask);
    expect(merged.permissions.allow).toBeUndefined();
  });

  it('unions and deduplicates, keeping existing entries first and in order', () => {
    const existing = { permissions: { deny: ['Z-user', baseline.permissions.deny[2], 'A-user'] } };
    const { deny } = mergeSettings(existing, [baseline]).permissions;
    expect(deny.slice(0, 3)).toEqual(['Z-user', baseline.permissions.deny[2], 'A-user']);
    expect(new Set(deny).size).toBe(deny.length);
    expect(deny).toHaveLength(baseline.permissions.deny.length + 2);
  });

  it('never removes existing entries, including ones the snippets do not know', () => {
    const existing = { permissions: { allow: ['Bash(custom)'], ask: ['Bash(also custom)'] } };
    const merged = mergeSettings(existing, [baseline, convenience]);
    expect(merged.permissions.allow).toContain('Bash(custom)');
    expect(merged.permissions.ask).toContain('Bash(also custom)');
  });

  it('preserves unrelated keys, their order, and the hooks block', () => {
    const existing = {
      model: 'opus',
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [] }] },
      permissions: { defaultMode: 'plan', deny: [] },
      theme: 'dark',
    };
    const merged = mergeSettings(existing, [baseline]);
    expect(Object.keys(merged)).toEqual(['model', 'hooks', 'permissions', 'theme']);
    expect(merged.hooks).toEqual(existing.hooks);
    expect(merged.model).toBe('opus');
    expect(merged.permissions.defaultMode).toBe('plan');
    expect(Object.keys(merged.permissions)).toEqual(['defaultMode', 'deny', 'ask']);
  });

  it('does not modify its input', () => {
    const existing = { permissions: { deny: ['x'] } };
    const copy = structuredClone(existing);
    mergeSettings(existing, [baseline]);
    expect(existing).toEqual(copy);
  });

  it('is idempotent', () => {
    const once = mergeSettings({}, [baseline, convenience]);
    expect(mergeSettings(once, [baseline, convenience])).toEqual(once);
  });

  it.each([
    ['settings is an array', []],
    ['permissions is a string', { permissions: 'x' }],
    ['permissions is an array', { permissions: [] }],
    ['permissions is null', { permissions: null }],
    ['deny is not an array', { permissions: { deny: 'x' } }],
    ['allow is an object', { permissions: { allow: {} } }],
  ])('refuses wrong types (%s)', (_n, existing) => {
    expect(() => mergeSettings(existing, [baseline])).toThrow(MergeError);
  });
});

describe('diffSettings', () => {
  it('lists only newly added entries per array', () => {
    const a = { permissions: { deny: ['a'], ask: ['q'] } };
    const b = { permissions: { deny: ['a', 'b'], ask: ['q'], allow: ['c'] } };
    expect(diffSettings(a, b)).toEqual({ deny: ['b'], allow: ['c'] });
  });

  it('is empty when nothing changed', () => {
    expect(diffSettings({}, {})).toEqual({});
  });
});

describe('findConflicts', () => {
  it('reports allow rules that a deny rule covers', () => {
    const merged = {
      permissions: { deny: ['Bash(*cdk deploy*)'], allow: ['Bash(cdk deploy --all)', 'Bash(cdk synth)'] },
    };
    expect(findConflicts(merged)).toEqual([{ allow: 'Bash(cdk deploy --all)', deny: 'Bash(*cdk deploy*)' }]);
  });

  it('reports an identical rule in allow and deny', () => {
    const merged = { permissions: { deny: ['Bash(x)'], allow: ['Bash(x)'] } };
    expect(findConflicts(merged)).toHaveLength(1);
  });

  it('can be limited to a set of deny rules', () => {
    const merged = { permissions: { deny: ['Bash(a*)', 'Bash(b*)'], allow: ['Bash(abc)', 'Bash(bcd)'] } };
    expect(findConflicts(merged, ['Bash(b*)'])).toEqual([{ allow: 'Bash(bcd)', deny: 'Bash(b*)' }]);
  });

  it('finds none in the shipped snippets', () => {
    expect(findConflicts(mergeSettings({}, [baseline, convenience]))).toEqual([]);
  });

  it('tolerates missing arrays and non-string entries', () => {
    expect(findConflicts({})).toEqual([]);
    expect(findConflicts({ permissions: { deny: ['x'], allow: [1] } })).toEqual([]);
  });
});

describe('CLI behavior', () => {
  it('creates the file and parent directory when missing', () => {
    const root = tmp();
    const r = runCli(['--scope', 'project', '--project-dir', root]);
    expect(r.code).toBe(0);
    expect(readSettings(root).permissions.deny).toEqual(baseline.permissions.deny);
    expect(readSettings(root).permissions.allow).toBeUndefined();
    expect(existsSync(`${settingsPath(root)}.bak`)).toBe(false);
  });

  it('writes two-space JSON with a trailing newline', () => {
    const root = tmp();
    runCli(['--scope', 'project', '--project-dir', root]);
    const text = readFileSync(settingsPath(root), 'utf8');
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
  });

  it('applies convenience only with --include-convenience', () => {
    const a = tmp();
    const b = tmp();
    runCli(['--scope', 'project', '--project-dir', a]);
    runCli(['--scope', 'project', '--project-dir', b, '--include-convenience']);
    expect(readSettings(a).permissions.allow).toBeUndefined();
    expect(readSettings(b).permissions.allow).toEqual(convenience.permissions.allow);
  });

  it('targets ~/.claude/settings.json for user scope', () => {
    const home = tmp();
    const r = runCli(['--scope', 'user'], { home });
    expect(r.code).toBe(0);
    expect(existsSync(path.join(home, '.claude', 'settings.json'))).toBe(true);
  });

  it('honors --settings-file without a scope', () => {
    const root = tmp();
    const file = path.join(root, 'custom', 'my-settings.json');
    expect(runCli(['--settings-file', file]).code).toBe(0);
    expect(JSON.parse(readFileSync(file, 'utf8')).permissions.deny).toHaveLength(baseline.permissions.deny.length);
  });

  it('is idempotent: a second run reports no changes and writes nothing', () => {
    const root = tmp();
    const args = ['--scope', 'project', '--project-dir', root, '--include-convenience'];
    runCli(args);
    const first = readFileSync(settingsPath(root));
    const mtime = statSync(settingsPath(root)).mtimeMs;
    const r = runCli(args);
    expect(r.code).toBe(0);
    expect(r.out).toContain('No changes');
    expect(readFileSync(settingsPath(root)).equals(first)).toBe(true);
    expect(statSync(settingsPath(root)).mtimeMs).toBe(mtime);
  });

  it('--dry-run prints the diff and writes nothing', () => {
    const root = tmp();
    const r = runCli(['--scope', 'project', '--project-dir', root, '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Would add');
    expect(r.out).toContain('+ Bash(*cdk deploy*)');
    expect(r.out).toContain('nothing was written');
    expect(existsSync(settingsPath(root))).toBe(false);
  });

  it('--dry-run leaves an existing file byte-identical', () => {
    const root = tmp();
    writeSettings(root, { model: 'opus' });
    const before = readFileSync(settingsPath(root));
    runCli(['--scope', 'project', '--project-dir', root, '--dry-run']);
    expect(readFileSync(settingsPath(root)).equals(before)).toBe(true);
    expect(existsSync(`${settingsPath(root)}.bak`)).toBe(false);
  });

  it('keeps a .bak of the original on the first change only', () => {
    const root = tmp();
    writeSettings(root, { model: 'opus', permissions: { allow: ['Bash(mine)'] } });
    const original = readFileSync(settingsPath(root), 'utf8');
    runCli(['--scope', 'project', '--project-dir', root]);
    expect(readFileSync(`${settingsPath(root)}.bak`, 'utf8')).toBe(original);
    runCli(['--scope', 'project', '--project-dir', root, '--include-convenience']);
    expect(readFileSync(`${settingsPath(root)}.bak`, 'utf8')).toBe(original);
  });

  it('leaves no temp files behind', () => {
    const root = tmp();
    runCli(['--scope', 'project', '--project-dir', root]);
    expect(readdirSync(path.join(root, '.claude'))).toEqual(['settings.json']);
  });

  it('preserves unrelated keys and existing user entry order in the file', () => {
    const root = tmp();
    writeSettings(root, {
      model: 'opus',
      hooks: { Stop: [] },
      permissions: { deny: ['Bash(zzz)', 'Bash(aaa)'] },
    });
    runCli(['--scope', 'project', '--project-dir', root]);
    const s = readSettings(root);
    expect(Object.keys(s)).toEqual(['model', 'hooks', 'permissions']);
    expect(s.hooks).toEqual({ Stop: [] });
    expect(s.permissions.deny.slice(0, 2)).toEqual(['Bash(zzz)', 'Bash(aaa)']);
  });

  it('keeps a symlinked settings.json as a symlink and edits the real file', () => {
    const root = tmp();
    const real = path.join(root, 'dotfiles', 'settings.json');
    mkdirSync(path.dirname(real));
    writeFileSync(real, '{}');
    mkdirSync(path.join(root, '.claude'));
    symlinkSync(real, settingsPath(root));
    runCli(['--scope', 'project', '--project-dir', root]);
    expect(JSON.parse(readFileSync(real, 'utf8')).permissions.deny.length).toBeGreaterThan(0);
    expect(readlinkSync(settingsPath(root))).toBe(real);
  });

  it('reports an allow rule that conflicts with a snippet deny rule', () => {
    const root = tmp();
    writeSettings(root, { permissions: { allow: ['Bash(cdk deploy --all)'] } });
    const r = runCli(['--scope', 'project', '--project-dir', root, '--dry-run']);
    expect(r.out).toContain('Conflicts');
    expect(r.out).toContain('allow Bash(cdk deploy --all)');
    expect(r.out).toContain('best-effort');
  });
});

describe('CLI refusals (exit 1, file untouched)', () => {
  const refuse = (content, expected) => {
    const root = tmp();
    writeSettings(root, content);
    const before = readFileSync(settingsPath(root));
    const r = runCli(['--scope', 'project', '--project-dir', root]);
    expect(r.code).toBe(1);
    expect(r.err).toContain(expected);
    expect(readFileSync(settingsPath(root)).equals(before)).toBe(true);
    expect(existsSync(`${settingsPath(root)}.bak`)).toBe(false);
  };

  it('invalid JSON', () => refuse('{nope', 'not valid JSON'));
  it('empty file', () => refuse('', 'not valid JSON'));
  it('top-level array', () => refuse('[]', 'must be a JSON object'));
  it('permissions of the wrong type', () => refuse({ permissions: 'x' }, '"permissions" must be an object'));
  it('a rule array of the wrong type', () =>
    refuse({ permissions: { deny: 'x' } }, '"permissions.deny" must be an array'));

  it('missing scope', () => {
    const r = runCli([]);
    expect(r.code).toBe(1);
    expect(r.err).toContain('--scope is required');
  });

  it('bad scope', () => {
    expect(runCli(['--scope', 'global']).code).toBe(1);
  });

  it('unknown option', () => {
    expect(runCli(['--scope', 'user', '--force']).code).toBe(1);
  });
});

describe('CLI exit 2 on unexpected errors', () => {
  it('returns 2 when the snippets directory is missing', () => {
    const root = tmp();
    const r = runCli(['--scope', 'project', '--project-dir', root], { snippetsDir: path.join(root, 'nope') });
    expect(r.code).toBe(2);
    expect(r.err).toContain('unexpected error');
  });

  it('returns 2 when the target cannot be written', () => {
    const root = tmp();
    writeFileSync(path.join(root, '.claude'), 'a file where a directory should be');
    expect(runCli(['--scope', 'project', '--project-dir', root]).code).toBe(2);
  });
});

describe('CLI process contract', () => {
  it('exits 0 and writes the file', () => {
    const root = tmp();
    const r = spawnSync(process.execPath, [SCRIPT, '--scope', 'project', '--project-dir', root], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Done.');
    expect(existsSync(settingsPath(root))).toBe(true);
  });

  it('exits 1 on invalid JSON with a message on stderr', () => {
    const root = tmp();
    writeSettings(root, '{nope');
    const r = spawnSync(process.execPath, [SCRIPT, '--scope', 'project', '--project-dir', root], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('not valid JSON');
  });

  it('exits 1 on a bad argument', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(r.status).toBe(1);
  });
});
