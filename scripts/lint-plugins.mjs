#!/usr/bin/env node
// Validates the lstk marketplace: manifests, skill and agent frontmatter, and plugin self-containment.
// Node built-ins only. Exports pure functions so Vitest can call them directly.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MARKETPLACE_PATH = '.claude-plugin/marketplace.json';
const FORBIDDEN_IN_MANIFEST_DIR = ['skills', 'agents', 'hooks', 'commands'];
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.mjs', '.js', '.cjs', '.sh', '.yaml', '.yml', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.git']);
// Official semver 2.0.0 pattern (https://semver.org).
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
// Claude Code documents lowercase letters, digits and hyphens. The 64-character cap follows the Agent Skills spec.
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_NAME_MAX = 64;
// The Agent Skills spec caps a description at 1024 characters. Descriptions sit in context, so aim for 500 or fewer.
const DESCRIPTION_MAX = 1024;
// A file path in a SKILL.md that points into the skill's own references/, scripts/, or templates/ directory.
const SKILL_FILE_REFERENCE =
  /(?<![\w./-])(?:\$\{CLAUDE_SKILL_DIR\}\/)?((?:references|scripts|templates)\/[^\s"'`()[\]<>]+)/g;

/**
 * Parse YAML-ish frontmatter. Supports `key: value`, quoted values, and indented continuation or block scalars.
 * @param {string} text
 * @returns {{ data: Record<string, string> } | null} null when there is no frontmatter block
 */
export function parseFrontmatter(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;

  const data = {};
  let i = 1;
  while (i < end) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    i += 1;
    if (!match) continue;
    const [, key, raw] = match;
    const parts = [];
    while (i < end && /^\s+\S/.test(lines[i])) {
      parts.push(lines[i].trim());
      i += 1;
    }
    let value = raw.trim();
    if (/^[>|][+-]?$/.test(value)) value = '';
    if (parts.length > 0) value = [value, ...parts].filter(Boolean).join(' ');
    data[key] = unquote(value);
  }
  return { data };
}

function unquote(value) {
  if (value.length >= 2 && /^(["']).*\1$/.test(value)) return value.slice(1, -1);
  return value;
}

function readJson(file, rel, problems) {
  if (!existsSync(file)) {
    problems.push({ file: rel, message: 'file not found' });
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push({ file: rel, message: `invalid JSON: ${error.message}` });
    return undefined;
  }
}

function isDirectory(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function checkMarketplace(rootDir, problems) {
  const marketplace = readJson(path.join(rootDir, MARKETPLACE_PATH), MARKETPLACE_PATH, problems);
  if (marketplace === undefined) return [];
  const add = (message) => problems.push({ file: MARKETPLACE_PATH, message });

  if (typeof marketplace !== 'object' || marketplace === null || Array.isArray(marketplace)) {
    add('must be a JSON object');
    return [];
  }
  if (!isNonEmptyString(marketplace.name)) add('"name" must be a non-empty string');
  if (
    typeof marketplace.owner !== 'object' ||
    marketplace.owner === null ||
    !isNonEmptyString(marketplace.owner.name)
  ) {
    add('"owner" must be an object with a non-empty "name"');
  }
  if (!Array.isArray(marketplace.plugins)) {
    add('"plugins" must be an array');
    return [];
  }

  const seen = new Set();
  const entries = [];
  marketplace.plugins.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || !isNonEmptyString(entry.name)) {
      add(`plugins[${index}] must be an object with a non-empty "name"`);
      return;
    }
    if (seen.has(entry.name)) add(`duplicate plugin name "${entry.name}"`);
    seen.add(entry.name);
    entries.push(entry);
  });
  return entries;
}

function checkPlugin(rootDir, entry, problems) {
  if (typeof entry.source !== 'string') {
    // Remote sources (github, git-subdir, ...) cannot be checked locally.
    if (typeof entry.source !== 'object' || entry.source === null) {
      problems.push({ file: MARKETPLACE_PATH, message: `plugin "${entry.name}": "source" is required` });
    }
    return;
  }

  const pluginDir = path.resolve(rootDir, entry.source);
  const relDir = path.relative(rootDir, pluginDir);
  if (relDir === '' || relDir.startsWith('..') || path.isAbsolute(relDir)) {
    problems.push({
      file: MARKETPLACE_PATH,
      message: `plugin "${entry.name}": source "${entry.source}" must be inside the repository`,
    });
    return;
  }
  if (!isDirectory(pluginDir)) {
    problems.push({
      file: MARKETPLACE_PATH,
      message: `plugin "${entry.name}": source directory "${entry.source}" does not exist`,
    });
    return;
  }

  const manifestRel = path.posix.join(relDir.split(path.sep).join('/'), '.claude-plugin/plugin.json');
  const manifest = readJson(path.join(rootDir, manifestRel), manifestRel, problems);
  if (manifest !== undefined) {
    if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
      problems.push({ file: manifestRel, message: 'must be a JSON object' });
    } else {
      if (manifest.name !== entry.name) {
        problems.push({
          file: manifestRel,
          message: `"name" (${JSON.stringify(manifest.name)}) must match marketplace entry "${entry.name}"`,
        });
      }
      if (manifest.version !== undefined && !(typeof manifest.version === 'string' && SEMVER.test(manifest.version))) {
        problems.push({
          file: manifestRel,
          message: `"version" (${JSON.stringify(manifest.version)}) is not valid semver`,
        });
      }
    }
  }

  for (const dir of FORBIDDEN_IN_MANIFEST_DIR) {
    const nested = path.join(pluginDir, '.claude-plugin', dir);
    if (existsSync(nested)) {
      problems.push({
        file: path.posix.join(relDir.split(path.sep).join('/'), '.claude-plugin', dir),
        message: `"${dir}" must sit at the plugin root, not inside .claude-plugin/`,
      });
    }
  }

  checkSkills(rootDir, pluginDir, problems);
  checkAgents(rootDir, pluginDir, problems);
  checkHooks(rootDir, pluginDir, problems);
  checkNoShellScripts(rootDir, pluginDir, problems);
  checkParentReferences(rootDir, pluginDir, problems);
}

function rel(rootDir, file) {
  return path.relative(rootDir, file).split(path.sep).join('/');
}

function checkFrontmatterFile(rootDir, file, problems) {
  const display = rel(rootDir, file);
  const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!parsed) {
    problems.push({
      file: display,
      message: 'missing or unterminated frontmatter block (must start on line 1 with ---)',
    });
    return undefined;
  }
  return { display, data: parsed.data };
}

function checkSkills(rootDir, pluginDir, problems) {
  const skillsDir = path.join(pluginDir, 'skills');
  if (!isDirectory(skillsDir)) return;
  for (const dirent of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const skillFile = path.join(skillsDir, dirent.name, 'SKILL.md');
    if (!existsSync(skillFile)) {
      problems.push({
        file: rel(rootDir, path.join(skillsDir, dirent.name)),
        message: 'skill directory has no SKILL.md',
      });
      continue;
    }
    const fm = checkFrontmatterFile(rootDir, skillFile, problems);
    if (!fm) continue;
    const { display, data } = fm;
    if (data.name !== dirent.name) {
      problems.push({
        file: display,
        message: `"name" (${JSON.stringify(data.name)}) must equal the directory name "${dirent.name}"`,
      });
    }
    if (typeof data.name === 'string' && data.name !== '') {
      if (!SKILL_NAME.test(data.name)) {
        problems.push({ file: display, message: '"name" must use lowercase letters, digits, and single hyphens' });
      }
      if (data.name.length > SKILL_NAME_MAX) {
        problems.push({ file: display, message: `"name" must be at most ${SKILL_NAME_MAX} characters` });
      }
    }
    if (!isNonEmptyString(data.description)) {
      problems.push({ file: display, message: '"description" must be non-empty' });
    } else if (data.description.length > DESCRIPTION_MAX) {
      problems.push({
        file: display,
        message: `"description" is ${data.description.length} characters; the maximum is ${DESCRIPTION_MAX}`,
      });
    }
    if (
      data['disable-model-invocation'] !== undefined &&
      !['true', 'false'].includes(data['disable-model-invocation'])
    ) {
      problems.push({
        file: display,
        message: `"disable-model-invocation" must be true or false, not ${JSON.stringify(data['disable-model-invocation'])}`,
      });
    }
    checkSkillLinks(rootDir, path.join(skillsDir, dirent.name), skillFile, problems);
  }
}

/** Every references/, scripts/, or templates/ path named in a SKILL.md must exist inside that skill. */
function checkSkillLinks(rootDir, skillDir, skillFile, problems) {
  const seen = new Set();
  readFileSync(skillFile, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const match of line.matchAll(SKILL_FILE_REFERENCE)) {
        const target = match[1].replace(/[.,:;]+$/, '');
        // Globs, placeholders, and variables are examples, not links.
        if (/[*<>{}$]/.test(target) || target.endsWith('/') || seen.has(target)) continue;
        seen.add(target);
        if (!existsSync(path.join(skillDir, target))) {
          problems.push({
            file: `${rel(rootDir, skillFile)}:${index + 1}`,
            message: `references "${target}", which does not exist in the skill`,
          });
        }
      }
    });
}

function checkAgents(rootDir, pluginDir, problems) {
  const agentsDir = path.join(pluginDir, 'agents');
  if (!isDirectory(agentsDir)) return;
  for (const dirent of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) continue;
    const fm = checkFrontmatterFile(rootDir, path.join(agentsDir, dirent.name), problems);
    if (!fm) continue;
    for (const field of ['name', 'description']) {
      if (!isNonEmptyString(fm.data[field]))
        problems.push({ file: fm.display, message: `"${field}" must be non-empty` });
    }
  }
}

function* walk(dir) {
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      if (!SKIP_DIRS.has(dirent.name)) yield* walk(path.join(dir, dirent.name));
    } else if (dirent.isFile()) {
      yield path.join(dir, dirent.name);
    }
  }
}

const PLUGIN_ROOT_REFERENCE = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"'`]+)/g;

/** hooks/hooks.json must be valid and every ${CLAUDE_PLUGIN_ROOT}/... path it uses must exist. */
function checkHooks(rootDir, pluginDir, problems) {
  const file = path.join(pluginDir, 'hooks', 'hooks.json');
  if (!existsSync(file)) return;
  const display = rel(rootDir, file);
  const manifest = readJson(file, display, problems);
  if (manifest === undefined) return;
  const add = (message) => problems.push({ file: display, message });

  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    typeof manifest.hooks !== 'object' ||
    manifest.hooks === null
  ) {
    add('must be an object with a top-level "hooks" object');
    return;
  }
  for (const [event, groups] of Object.entries(manifest.hooks)) {
    if (!Array.isArray(groups)) {
      add(`"hooks.${event}" must be an array`);
      continue;
    }
    for (const group of groups) {
      const handlers = Array.isArray(group?.hooks) ? group.hooks : [];
      if (handlers.length === 0) add(`"hooks.${event}" has a matcher group with no "hooks" array`);
      for (const handler of handlers) {
        const strings = [handler?.command, ...(Array.isArray(handler?.args) ? handler.args : [])];
        for (const text of strings.filter((s) => typeof s === 'string')) {
          for (const match of text.matchAll(PLUGIN_ROOT_REFERENCE)) {
            if (!existsSync(path.join(pluginDir, match[1]))) {
              add(`"hooks.${event}" references "${match[1]}", which does not exist in the plugin`);
            }
          }
        }
      }
    }
  }
}

/** Plugins ship Node .mjs scripts. A shell script would add a bash and jq dependency. */
function checkNoShellScripts(rootDir, pluginDir, problems) {
  for (const file of walk(pluginDir)) {
    if (path.extname(file) === '.sh') {
      problems.push({ file: rel(rootDir, file), message: 'shell scripts are not allowed in plugins; use Node .mjs' });
    }
  }
}

function checkParentReferences(rootDir, pluginDir, problems) {
  for (const file of walk(pluginDir)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (line.includes('../')) {
          problems.push({
            file: `${rel(rootDir, file)}:${index + 1}`,
            message: 'contains "../"; plugins are copied to a cache and cannot reference files outside their directory',
          });
        }
      });
  }
}

/**
 * Lint the marketplace rooted at `rootDir`.
 * @param {string} rootDir
 * @returns {{ file: string, message: string }[]} problems; empty when the repo is clean
 */
export function lintRepo(rootDir) {
  const problems = [];
  const entries = checkMarketplace(rootDir, problems);
  for (const entry of entries) checkPlugin(rootDir, entry, problems);
  return problems;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const problems = lintRepo(rootDir);
  if (problems.length === 0) {
    console.log('lint-plugins: no problems found');
    return 0;
  }
  for (const { file, message } of problems) console.error(`${file}: ${message}`);
  console.error(`\nlint-plugins: ${problems.length} problem${problems.length === 1 ? '' : 's'} found`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
