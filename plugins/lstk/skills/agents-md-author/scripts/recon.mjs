#!/usr/bin/env node
// recon.mjs - Read-only repository reconnaissance for the agents-md-author skill.
// Usage: node recon.mjs [repo-root]
// Makes no changes. Output is plain text intended for an agent to read.
// Node built-ins only. Exports a pure `recon(rootDir)` so tests can call it directly.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Directories never worth descending into.
const PRUNE = new Set([
  'node_modules',
  '.git',
  'vendor',
  'dist',
  'build',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.next',
  '.terraform',
  'cdk.out',
  'coverage',
  '.gradle',
  'Pods',
  'Carthage',
  'DerivedData',
  '.build',
  'obj',
  '.dart_tool',
  '.pub-cache',
  '.idea',
  '.mypy_cache',
  '.pytest_cache',
  '.tox',
  '.cache',
]);
const isPruned = (name) => PRUNE.has(name) || name.startsWith('bazel-');

const INSTRUCTION_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'CLAUDE.local.md',
  'GEMINI.md',
  'copilot-instructions.md',
  '*.instructions.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  'CONVENTIONS.md',
];

const MANIFEST_FILES = [
  // JS/TS/Node
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lockb',
  'deno.json',
  // Python
  'pyproject.toml',
  'requirements*.txt',
  'setup.py',
  'setup.cfg',
  'Pipfile',
  'uv.lock',
  'poetry.lock',
  'pdm.lock',
  'tox.ini',
  'noxfile.py',
  // Go
  'go.mod',
  'go.sum',
  // Rust
  'Cargo.toml',
  'Cargo.lock',
  'rust-toolchain*',
  // Java/Kotlin/Android
  'pom.xml',
  'build.gradle*',
  'settings.gradle*',
  'gradlew',
  'mvnw',
  'libs.versions.toml',
  'AndroidManifest.xml',
  // .NET
  '*.csproj',
  '*.fsproj',
  '*.vbproj',
  '*.sln',
  '*.slnx',
  'global.json',
  'Directory.Build.props',
  'Directory.Packages.props',
  'nuget.config',
  // Ruby
  'Gemfile',
  'Gemfile.lock',
  '*.gemspec',
  'Rakefile',
  // PHP
  'composer.json',
  'composer.lock',
  'artisan',
  // Swift/iOS
  'Package.swift',
  'Podfile',
  'Cartfile',
  'Fastfile',
  'project.yml',
  // Dart/Flutter
  'pubspec.yaml',
  'pubspec.lock',
  'melos.yaml',
  // C/C++/Bazel
  'CMakeLists.txt',
  'CMakePresets.json',
  'meson.build',
  'configure.ac',
  'conanfile.txt',
  'conanfile.py',
  'vcpkg.json',
  'BUILD',
  'BUILD.bazel',
  '.bazelrc',
  '.bazelversion',
  // Generic task runners
  'Makefile',
  'justfile',
  'Taskfile.yml',
];

const WORKSPACE_FILES = [
  'pnpm-workspace.yaml',
  'lerna.json',
  'nx.json',
  'turbo.json',
  'go.work',
  'rush.json',
  'WORKSPACE',
  'MODULE.bazel',
  'melos.yaml',
];

const CONFIG_FILES = [
  '.env.example',
  '.env.sample',
  '.env.template',
  'Dockerfile',
  'Dockerfile.*',
  'docker-compose*.yml',
  'compose*.yaml',
  'devcontainer.json',
  'cdk.json',
  'serverless.yml',
  'template.yaml',
  '*.tf',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  'azure-pipelines.yml',
  '.editorconfig',
  '.nvmrc',
  '.tool-versions',
  '.python-version',
  '.swiftlint.yml',
  '.swiftformat',
  'analysis_options.yaml',
  '.rubocop.yml',
  'phpunit.xml*',
  'phpstan.neon*',
  '.php-cs-fixer*',
  '.clang-format',
  '.clang-tidy',
  'ruff.toml',
  '.golangci.y*ml',
  'rustfmt.toml',
  'clippy.toml',
  'detekt.yml',
  '*.xcconfig',
  'lint.xml',
  '.mvn',
];

/** Compile a find-style `-name` glob (`*` and `?` only) to a RegExp. */
function globToRegExp(glob, flags = '') {
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${source}$`, flags);
}

const matcher = (globs, flags = '') => {
  const patterns = globs.map((g) => globToRegExp(g, flags));
  return (name) => patterns.some((p) => p.test(name));
};

/**
 * Walk `root` down to `maxDepth`, skipping pruned directories entirely (as `find -prune` does) and not following
 * symlinks. Entries directly under `root` have depth 1.
 * @returns {{ rel: string, name: string, type: 'f' | 'd' | 'o', depth: number }[]}
 */
function walk(root, maxDepth) {
  const out = [];
  const visit = (dir, rel, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const type = entry.isDirectory() ? 'd' : entry.isFile() ? 'f' : 'o';
      if (type === 'd' && isPruned(entry.name)) continue;
      const entryRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      out.push({ rel: entryRel, name: entry.name, type, depth });
      if (type === 'd' && depth < maxDepth) visit(path.join(dir, entry.name), entryRel, depth + 1);
    }
  };
  visit(root, '', 1);
  return out;
}

const sorted = (list) => [...list].sort();

function findFiles(root, maxDepth, nameMatches, extra = () => false) {
  return sorted(
    walk(root, maxDepth)
      .filter((e) => e.type === 'f' && (nameMatches(e.name) || extra(e)))
      .map((e) => `./${e.rel}`),
  );
}

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
}

const fileExists = (root, name) => existsSync(path.join(root, name)) && statSync(path.join(root, name)).isFile();
const dirExists = (root, name) => existsSync(path.join(root, name)) && statSync(path.join(root, name)).isDirectory();

function readText(root, name) {
  try {
    return readFileSync(path.join(root, name), 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * Produce the reconnaissance report for the repository at `rootDir`. Read-only.
 * @param {string} [rootDir]
 * @returns {string}
 * @throws {Error} when `rootDir` is not a readable directory
 */
export function recon(rootDir = '.') {
  const root = path.resolve(rootDir);
  if (!dirExists(path.dirname(root), path.basename(root))) throw new Error(`Cannot cd to ${rootDir}`);

  const lines = [];
  const out = (...items) => lines.push(...items);
  const section = (title) => out('', `=== ${title} ===`);
  const listOr = (list, empty) => out(list.length === 0 ? empty : list.join('\n'));

  out(`=== Repo root: ${root} ===`);
  const isGit = git(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
  if (isGit) {
    const branch =
      git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) ||
      git(root, ['symbolic-ref', '--short', '-q', 'HEAD']) ||
      'HEAD';
    const last = git(root, ['log', '-1', '--format=%cs']) || 'none (no commits yet)';
    out(`git: yes, branch ${branch}, last commit ${last}`);
  } else {
    out('git: no (freshness drift signals unavailable)');
  }

  section('Existing agent instruction files');
  const instructionFiles = findFiles(
    root,
    5,
    matcher(INSTRUCTION_FILES),
    (e) => e.rel === '.junie/guidelines.md' || e.rel.endsWith('/.junie/guidelines.md'),
  );
  listOr(instructionFiles, '(none found)');
  for (const dir of ['.claude', '.cursor/rules', '.clinerules', '.github/instructions']) {
    if (!dirExists(root, dir)) continue;
    out(`dir: ${dir}`);
    for (const name of sorted(readdirSync(path.join(root, dir)))) out(`  ${name}`);
  }

  section('Manifests and lockfiles (depth <= 3)');
  const manifests = findFiles(root, 3, matcher(MANIFEST_FILES));
  listOr(manifests, '(none found)');

  section('Android manifests (depth <= 6)');
  const android = sorted(
    walk(root, 6)
      .filter((e) => e.type === 'f' && e.name === 'AndroidManifest.xml')
      .map((e) => `./${e.rel}`),
  ).slice(0, 10);
  if (android.length > 0) out(android.join('\n'));

  section('Xcode projects (directories, depth <= 4)');
  const isXcode = matcher(['*.xcodeproj', '*.xcworkspace']);
  const xcode = sorted(
    walk(root, 4)
      .filter((e) => e.type === 'd' && isXcode(e.name))
      .map((e) => `./${e.rel}`),
  );
  if (xcode.length > 0) out(xcode.join('\n'));

  section('Monorepo / workspace markers');
  const markers = findFiles(root, 2, matcher(WORKSPACE_FILES));
  const extraMarkers = [];
  if ((readText(root, 'package.json') ?? '').includes('"workspaces"')) {
    extraMarkers.push('package.json declares workspaces: package.json');
  }
  if (/^\[workspace\]/m.test(readText(root, 'Cargo.toml') ?? '')) extraMarkers.push('Cargo workspace: Cargo.toml');
  if ((readText(root, 'pom.xml') ?? '').includes('<modules>')) extraMarkers.push('Maven multi-module: pom.xml');
  for (const name of ['settings.gradle', 'settings.gradle.kts']) {
    if ((readText(root, name) ?? '').includes('include')) {
      extraMarkers.push(`Gradle multi-project (check includes): ${name}`);
    }
  }
  if ((readText(root, 'pyproject.toml') ?? '').includes('tool.uv.workspace')) {
    extraMarkers.push('uv workspace: pyproject.toml');
  }
  for (const entry of sorted(readdirSync(root))) {
    if (/\.slnx?$/.test(entry) && fileExists(root, entry)) {
      extraMarkers.push(`.NET solution (multi-project likely): ./${entry}`);
    }
  }
  if (markers.length > 0) out(markers.join('\n'));
  if (extraMarkers.length > 0) out(extraMarkers.join('\n'));
  if (markers.length === 0 && extraMarkers.length === 0) {
    out('(no explicit markers; judge from tree and manifest count)');
  }

  section('Config, container, IaC, CI');
  const config = findFiles(root, 3, matcher(CONFIG_FILES));
  if (config.length > 0) out(config.join('\n'));
  if (dirExists(root, '.github/workflows')) {
    for (const name of sorted(readdirSync(path.join(root, '.github/workflows')))) {
      out(`.github/workflows/${name}`);
    }
  }

  section('Root layout (2 levels)');
  // The shell original piped through `head -150`, and the leading `.` counts toward that limit.
  out('.', ...sorted(walk(root, 2).map((e) => e.rel)).slice(0, 149));

  section('Human docs');
  const isHumanDoc = matcher(['README*', 'CONTRIBUTING*', 'ARCHITECTURE*'], 'i');
  const humanDocs = findFiles(root, 2, isHumanDoc).slice(0, 20);
  if (humanDocs.length > 0) out(humanDocs.join('\n'));
  if (dirExists(root, 'docs')) out('docs/ present');
  if (dirExists(root, 'docs/adr') || dirExists(root, 'doc/adr')) out('ADR directory present');

  if (isGit && instructionFiles.length > 0 && manifests.length > 0) {
    section("Freshness drift: manifest/CI commits after each instruction file's last edit");
    const count = (args) => (git(root, ['log', '--oneline', ...args]) ?? '').split('\n').filter(Boolean).length;
    for (const file of instructionFiles) {
      const last = git(root, ['log', '-1', '--format=%cI', '--', file]);
      if (!last) {
        out(`${file}: untracked or no history`);
        continue;
      }
      const since = `--since=${last}`;
      const manifestCommits = count([since, '--', ...manifests, '.github/workflows']);
      const totalCommits = count([since]);
      out(
        `${file}: last edited ${last.split('T')[0]}; ${manifestCommits} manifest/CI commits and ${totalCommits} total commits since`,
      );
    }
  }

  out('', '=== Done. Next: verify instruction content against these findings (Phase 0). ===');
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    process.stdout.write(recon(process.argv[2] ?? '.'));
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
