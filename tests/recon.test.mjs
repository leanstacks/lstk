import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { recon } from '../plugins/lstk/skills/agents-md-author/scripts/recon.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/lstk/skills/agents-md-author/scripts/recon.mjs', import.meta.url));
const tmpDirs = [];
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const git = (cwd, ...args) => execFileSync('git', args, { cwd, env: GIT_ENV, stdio: 'ignore' });

function makeDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'lstk-recon-'));
  tmpDirs.push(dir);
  return dir;
}

function write(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

function makeRepo(files = {}) {
  const dir = makeDir();
  git(dir, 'init', '-q');
  write(dir, files);
  if (Object.keys(files).length > 0) {
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'init');
  }
  return dir;
}

/** Split a report into `{ heading: [lines] }`. The first block (before any section) is keyed "header". */
function sections(report) {
  const result = { header: [] };
  let current = 'header';
  for (const line of report.split('\n')) {
    const match = /^=== (.*) ===$/.exec(line);
    if (match && !line.startsWith('=== Repo root')) {
      current = match[1];
      result[current] = [];
    } else {
      if (line !== '') result[current].push(line);
    }
  }
  return result;
}

/** Snapshot of every entry under `root` (relative path plus size), used to assert read-only behavior. */
function snapshot(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('recon: section structure', () => {
  it('prints every section in the documented order', () => {
    const root = makeRepo({ 'AGENTS.md': '# a', 'package.json': '{}' });
    const headings = [...recon(root).matchAll(/^=== (.*) ===$/gm)].map((m) => m[1]);
    expect(headings.map((h) => h.replace(/^Repo root: .*/, 'Repo root'))).toEqual([
      'Repo root',
      'Existing agent instruction files',
      'Manifests and lockfiles (depth <= 3)',
      'Android manifests (depth <= 6)',
      'Xcode projects (directories, depth <= 4)',
      'Monorepo / workspace markers',
      'Config, container, IaC, CI',
      'Root layout (2 levels)',
      'Human docs',
      "Freshness drift: manifest/CI commits after each instruction file's last edit",
      'Done. Next: verify instruction content against these findings (Phase 0).',
    ]);
  });
});

describe('recon: fixture repositories', () => {
  it('handles an empty git repository', () => {
    const root = makeRepo();
    const report = recon(root);
    const s = sections(report);
    expect(report).toContain(`=== Repo root: ${root} ===`);
    expect(s.header.join('\n')).toMatch(/git: yes, branch \S+, last commit none/);
    expect(s['Existing agent instruction files']).toContain('(none found)');
    expect(s['Manifests and lockfiles (depth <= 3)']).toContain('(none found)');
    expect(s['Monorepo / workspace markers']).toContain('(no explicit markers; judge from tree and manifest count)');
    expect(report).not.toContain('Freshness drift');
  });

  it('describes a single-package Node repo with an AGENTS.md', () => {
    const root = makeRepo({ 'package.json': '{"name":"x"}', 'AGENTS.md': '# a', 'README.md': 'r' });
    writeFileSync(path.join(root, 'package.json'), '{"name":"y"}');
    git(root, 'commit', '-q', '-am', 'bump');
    const s = sections(recon(root));

    expect(s.header.join('\n')).toMatch(/git: yes, branch \S+, last commit \d{4}-\d{2}-\d{2}/);
    expect(s['Existing agent instruction files']).toContain('./AGENTS.md');
    expect(s['Manifests and lockfiles (depth <= 3)']).toContain('./package.json');
    expect(s['Monorepo / workspace markers']).toContain('(no explicit markers; judge from tree and manifest count)');
    expect(s['Root layout (2 levels)']).toEqual(
      expect.arrayContaining(['.', 'AGENTS.md', 'README.md', 'package.json']),
    );
    expect(s['Human docs']).toContain('./README.md');
    const drift = Object.entries(s).find(([k]) => k.startsWith('Freshness drift'))[1];
    expect(drift.join('\n')).toMatch(
      /^\.\/AGENTS\.md: last edited \d{4}-\d{2}-\d{2}; \d+ manifest\/CI commits and \d+ total commits since$/m,
    );
  });

  it('describes a monorepo with workspaces, CI, and IaC', () => {
    const root = makeRepo({
      'package.json': '{"workspaces":["apps/*"]}',
      'apps/web/package.json': '{}',
      'packages/lib/package.json': '{}',
      'pnpm-workspace.yaml': 'packages: []',
      '.github/workflows/ci.yml': 'x',
      'infra/main.tf': 'x',
      Dockerfile: 'x',
      'CLAUDE.md': '# c',
      '.claude/settings.json': '{}',
      'docs/ARCHITECTURE.md': 'a',
      'docs/adr/0001.md': 'a',
      'README.md': 'r',
    });
    const s = sections(recon(root));

    expect(s['Existing agent instruction files']).toEqual(
      expect.arrayContaining(['./CLAUDE.md', 'dir: .claude', '  settings.json']),
    );
    expect(s['Manifests and lockfiles (depth <= 3)']).toEqual(
      expect.arrayContaining(['./package.json', './apps/web/package.json', './packages/lib/package.json']),
    );
    expect(s['Monorepo / workspace markers']).toEqual(
      expect.arrayContaining(['./pnpm-workspace.yaml', 'package.json declares workspaces: package.json']),
    );
    expect(s['Monorepo / workspace markers']).not.toContain(
      '(no explicit markers; judge from tree and manifest count)',
    );
    expect(s['Config, container, IaC, CI']).toEqual(
      expect.arrayContaining(['./Dockerfile', './infra/main.tf', '.github/workflows/ci.yml']),
    );
    expect(s['Root layout (2 levels)']).toEqual(
      expect.arrayContaining(['apps', 'apps/web', 'docs/adr', '.github/workflows']),
    );
    expect(s['Human docs']).toEqual(
      expect.arrayContaining(['./docs/ARCHITECTURE.md', './README.md', 'docs/ present', 'ADR directory present']),
    );
  });

  it('detects other workspace and platform markers', () => {
    const root = makeDir();
    write(root, {
      'Cargo.toml': '[workspace]\nmembers = []',
      'pom.xml': '<project><modules><module>a</module></modules></project>',
      'settings.gradle': "include ':app'",
      'pyproject.toml': '[tool.uv.workspace]',
      'App.sln': '',
      'ios/App.xcodeproj/project.pbxproj': '',
      'android/app/src/main/AndroidManifest.xml': '<manifest/>',
    });
    const s = sections(recon(root));
    expect(s['Monorepo / workspace markers']).toEqual(
      expect.arrayContaining([
        'Cargo workspace: Cargo.toml',
        'Maven multi-module: pom.xml',
        'Gradle multi-project (check includes): settings.gradle',
        'uv workspace: pyproject.toml',
        '.NET solution (multi-project likely): ./App.sln',
      ]),
    );
    expect(s['Xcode projects (directories, depth <= 4)']).toContain('./ios/App.xcodeproj');
    expect(s['Android manifests (depth <= 6)']).toContain('./android/app/src/main/AndroidManifest.xml');
  });
});

describe('recon: degraded and edge cases', () => {
  it('reports "git: no" outside a git repository and skips the freshness check', () => {
    const root = makeDir();
    write(root, { 'AGENTS.md': '# a', 'package.json': '{}' });
    const report = recon(root);
    expect(report).toContain('git: no (freshness drift signals unavailable)');
    expect(report).not.toContain('Freshness drift');
  });

  it('marks an untracked instruction file as having no history', () => {
    const root = makeRepo({ 'package.json': '{}' });
    write(root, { 'AGENTS.md': '# a' });
    expect(recon(root)).toContain('./AGENTS.md: untracked or no history');
  });

  it('throws for a missing path and for a file path', () => {
    const root = makeDir();
    write(root, { 'file.txt': 'x' });
    expect(() => recon(path.join(root, 'missing'))).toThrow(/Cannot cd to/);
    expect(() => recon(path.join(root, 'file.txt'))).toThrow(/Cannot cd to/);
  });

  it('skips pruned directories at any depth', () => {
    const root = makeDir();
    write(root, {
      'package.json': '{}',
      'node_modules/dep/package.json': '{}',
      'vendor/AGENTS.md': 'x',
      'apps/web/node_modules/x/package.json': '{}',
      'bazel-out/BUILD': 'x',
      'dist/Dockerfile': 'x',
      'src/package.json': '{}',
    });
    const report = recon(root);
    const s = sections(report);
    expect(s['Manifests and lockfiles (depth <= 3)']).toEqual(['./package.json', './src/package.json']);
    expect(s['Existing agent instruction files']).toContain('(none found)');
    expect(report).not.toMatch(/node_modules|bazel-out|vendor|dist/);
  });

  it('does not follow symlinks', () => {
    const root = makeDir();
    const outside = makeDir();
    write(outside, { 'package.json': '{}' });
    write(root, { 'real/package.json': '{}' });
    symlinkSync(outside, path.join(root, 'linked'));
    const s = sections(recon(root));
    expect(s['Manifests and lockfiles (depth <= 3)']).toEqual(['./real/package.json']);
  });

  it('respects the depth limits', () => {
    const root = makeDir();
    write(root, { 'a/b/package.json': '{}', 'a/b/c/package.json': '{}' });
    const s = sections(recon(root));
    expect(s['Manifests and lockfiles (depth <= 3)']).toContain('./a/b/package.json');
    expect(s['Manifests and lockfiles (depth <= 3)']).not.toContain('./a/b/c/package.json');
  });

  it('caps the root layout at 150 lines', () => {
    const root = makeDir();
    for (let i = 0; i < 200; i += 1) write(root, { [`f${String(i).padStart(3, '0')}.txt`]: '' });
    const layout = sections(recon(root))['Root layout (2 levels)'];
    expect(layout).toHaveLength(150);
  });
});

describe('recon: read-only', () => {
  it('leaves the directory tree unchanged, including .git', () => {
    const root = makeRepo({ 'AGENTS.md': '# a', 'package.json': '{}', 'docs/adr/1.md': 'x' });
    const before = snapshot(root);
    recon(root);
    expect(snapshot(root)).toEqual(before);
  });
});

describe('recon: CLI', () => {
  it('prints the report for a path argument and exits 0', () => {
    const root = makeRepo({ 'package.json': '{}' });
    const result = spawnSync('node', [SCRIPT, root], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`=== Repo root: ${root} ===`);
  });

  it('exits 1 with a message for a missing path', () => {
    const result = spawnSync('node', [SCRIPT, path.join(makeDir(), 'nope')], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cannot cd to');
  });
});
