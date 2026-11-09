import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { evaluate } from '../../plugins/lstk-guardrails/hooks/protect-files.mjs';
import { matrixRows, withRow } from './helpers.mjs';

const HOOK = new URL('../../plugins/lstk-guardrails/hooks/protect-files.mjs', import.meta.url).pathname;
const rows = matrixRows('protect-files');

describe('protect-files evaluate() against hook-matrix.json', () => {
  it.each(rows.map((r) => [r.id, r]))('%s', (_id, row) => {
    withRow(row, (input) => {
      expect(evaluate(input, { env: {}, warn: () => {} }).decision).toBe(row.target);
    });
  });
});

const dirs = [];
function project(files = {}, links = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'lstk-protect-'));
  dirs.push(root);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  for (const [link, target] of Object.entries(links)) symlinkSync(target, path.join(root, link));
  return root;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const config = (obj) => ({ '.claude/lstk.json': JSON.stringify(obj) });
function check(root, file_path, { env = {}, cwd = root } = {}) {
  const warnings = [];
  const result = evaluate({ tool_input: { file_path }, cwd }, { env, warn: (m) => warnings.push(m) });
  return { ...result, warnings };
}

describe('protect-files configuration', () => {
  it('uses the defaults when there is no config file', () => {
    const root = project();
    expect(check(root, '.env').decision).toBe('deny');
    expect(check(root, 'src/a.ts').decision).toBe('allow');
  });

  it('adds protectedPatterns to the defaults', () => {
    const root = project(config({ protectedPatterns: ['secrets/', '*.pem'] }));
    expect(check(root, 'secrets/key.txt').decision).toBe('deny');
    expect(check(root, 'certs/a.pem').decision).toBe('deny');
    expect(check(root, '.env').decision).toBe('deny');
  });

  it('removes a default with unprotectPatterns', () => {
    const root = project(config({ unprotectPatterns: ['package-lock.json'] }));
    expect(check(root, 'package-lock.json').decision).toBe('allow');
    expect(check(root, '.env').decision).toBe('deny');
  });

  it('lets unprotectPatterns exempt a path from a user pattern', () => {
    const root = project(config({ protectedPatterns: ['secrets/'], unprotectPatterns: ['secrets/public.txt'] }));
    expect(check(root, 'secrets/public.txt').decision).toBe('allow');
    expect(check(root, 'secrets/private.txt').decision).toBe('deny');
  });

  it('merges .claude/lstk.local.json after the project file', () => {
    const root = project({
      ...config({ protectedPatterns: ['a/'] }),
      '.claude/lstk.local.json': JSON.stringify({ protectedPatterns: ['b/'], unprotectPatterns: ['.env'] }),
    });
    expect(check(root, 'a/x').decision).toBe('deny');
    expect(check(root, 'b/x').decision).toBe('deny');
    expect(check(root, '.env').decision).toBe('allow');
  });

  it('still blocks template env files when a user pattern names them', () => {
    const root = project(config({ protectedPatterns: ['.env.example'] }));
    expect(check(root, '.env.example').decision).toBe('deny');
  });

  it('falls back to the defaults and warns on invalid JSON', () => {
    const root = project({ '.claude/lstk.json': '{nope' });
    const r = check(root, '.env');
    expect(r.decision).toBe('deny');
    expect(r.warnings[0]).toContain('not valid JSON');
    expect(check(root, 'src/a.ts').decision).toBe('allow');
  });

  it('falls back to the defaults and warns on wrong types', () => {
    const root = project(config({ protectedPatterns: 'secrets/' }));
    const r = check(root, 'secrets/a');
    expect(r.decision).toBe('allow');
    expect(r.warnings[0]).toContain('array of non-empty strings');
  });

  it('reads the config from CLAUDE_PROJECT_DIR when set', () => {
    const root = project(config({ protectedPatterns: ['secrets/'] }));
    const elsewhere = project();
    const r = check(root, path.join(root, 'secrets/a'), { cwd: elsewhere, env: { CLAUDE_PROJECT_DIR: root } });
    expect(r.decision).toBe('deny');
    expect(r.reason).toContain('`secrets/a`');
  });
});

describe('protect-files path handling', () => {
  it('blocks traversal back to a protected file', () => {
    const root = project({ 'src/a.ts': '' });
    expect(check(root, 'src/../.env').decision).toBe('deny');
    expect(check(root, 'src/../../x/.env').decision).toBe('deny');
  });

  it('blocks an absolute path inside the project', () => {
    const root = project();
    expect(check(root, path.join(root, 'apps/api/.env')).decision).toBe('deny');
  });

  it('blocks a symlink to a protected file', () => {
    const root = project({ '.env': '' }, { alias: '.env' });
    const r = check(root, 'alias');
    expect(r.decision).toBe('deny');
    expect(r.reason).toContain('`.env`');
  });

  it('blocks a dangling symlink whose target is protected', () => {
    const root = project({}, { alias: '.env' });
    expect(check(root, 'alias').decision).toBe('deny');
  });

  it('blocks a new file under a symlinked .git directory', () => {
    const root = project({ '.git/config': '' }, { gitlink: '.git' });
    expect(check(root, 'gitlink/hooks/new-hook').decision).toBe('deny');
  });

  it('blocks a symlink named like a protected file even if it points elsewhere', () => {
    const root = project({ 'safe.txt': '' }, { '.env': 'safe.txt' });
    expect(check(root, '.env').decision).toBe('deny');
  });

  it('allows a symlink to an unprotected file', () => {
    const root = project({ 'safe.txt': '' }, { alias: 'safe.txt' });
    expect(check(root, 'alias').decision).toBe('allow');
  });

  it('matches protected names outside the project root', () => {
    const root = project();
    expect(check(root, '/somewhere/else/.env').decision).toBe('deny');
    expect(check(root, '/somewhere/else/a.txt').decision).toBe('allow');
  });

  it('normalizes backslash separators', () => {
    const root = project();
    expect(check(root, 'apps\\api\\.env').decision).toBe('deny');
    expect(check(root, '.git\\config').decision).toBe('deny');
  });

  it('tolerates missing fields', () => {
    expect(evaluate({}, { env: {} }).decision).toBe('allow');
    expect(evaluate({ tool_input: {} }, { env: {} }).decision).toBe('allow');
    expect(evaluate({ tool_input: { file_path: '' } }, { env: {} }).decision).toBe('allow');
    expect(evaluate(undefined, { env: {} }).decision).toBe('allow');
  });

  it('gives the block message what, why, and instead', () => {
    const root = project();
    const { reason } = check(root, 'apps/.env.local');
    expect(reason).toContain('Blocked: `apps/.env.local` matches protected pattern `.env.*`');
    expect(reason).toContain('Protected files are changed by a human');
    expect(reason).toContain('`unprotectPatterns` in `.claude/lstk.json`');
  });
});

describe('protect-files process contract', () => {
  const spawn = (root, file_path, input) =>
    spawnSync(process.execPath, [HOOK], {
      input: input ?? JSON.stringify({ tool_name: 'Edit', tool_input: { file_path }, cwd: root }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: '' },
    });

  it('denies through hookSpecificOutput JSON on stdout with exit 0', () => {
    const r = spawn(project(), '.env');
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    expect(out.hookEventName).toBe('PreToolUse');
    expect(out.permissionDecision).toBe('deny');
    expect(out.permissionDecisionReason).toContain('protected pattern');
    expect(r.stderr).toBe('');
  });

  it('prints nothing for an allowed path', () => {
    const r = spawn(project(), 'src/index.ts');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  it('warns on stderr for a bad config but still blocks', () => {
    const r = spawn(project({ '.claude/lstk.json': '{nope' }), '.env');
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
    expect(r.stderr).toContain('not valid JSON');
  });

  it('fails open on malformed input', () => {
    const r = spawn(project(), '.env', '{bad');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('protect-files internal error');
  });
});
