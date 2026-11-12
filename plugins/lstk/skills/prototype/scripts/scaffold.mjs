#!/usr/bin/env node
// scaffold.mjs - Copy a prototype template into <target>/prototypes/<name>/ for the prototype skill.
// Usage: node scaffold.mjs --shape web|lambda --name <kebab-name> --target <dir>
// Writes only inside <target>/prototypes/<name>/. Never runs npm and never overwrites existing work.
// Prints the created files as JSON on stdout. Errors go to stderr with exit code 1.
// Node built-ins only. Exports a pure `scaffold()` so tests can call it directly.

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SHAPES = ['web', 'lambda'];
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 40;
// Templates ship `_gitignore` so tooling that treats `.gitignore` specially does not act on the template tree.
const RENAMES = { _gitignore: '.gitignore' };
const TEMPLATES_DIR = path.join(import.meta.dirname, '..', 'templates');

export class ScaffoldError extends Error {}

/** @returns {string | null} a reason the name is invalid, or null when it is valid */
export function nameProblem(name) {
  if (typeof name !== 'string' || name === '') return 'name is required';
  if (name.length > MAX_NAME_LENGTH) return `name must be at most ${MAX_NAME_LENGTH} characters`;
  if (!NAME_PATTERN.test(name))
    return 'name must be kebab-case: lowercase letters, digits, and single hyphens, starting with a letter';
  return null;
}

function* walk(dir, base = dir) {
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) yield* walk(full, base);
    else if (dirent.isFile()) yield path.relative(base, full);
  }
}

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Copy a template into <target>/prototypes/<name>/.
 * @param {{ shape: string, name: string, target: string, date?: string, templatesDir?: string }} options
 * @returns {{ shape: string, name: string, directory: string, files: string[] }} files are relative to `directory`
 */
export function scaffold({ shape, name, target, date = today(), templatesDir = TEMPLATES_DIR }) {
  if (!SHAPES.includes(shape)) throw new ScaffoldError(`shape must be one of: ${SHAPES.join(', ')}`);
  const problem = nameProblem(name);
  if (problem) throw new ScaffoldError(problem);
  if (typeof target !== 'string' || target === '') throw new ScaffoldError('target is required');

  const targetDir = path.resolve(target);
  if (!existsSync(targetDir) || !lstatSync(targetDir).isDirectory()) {
    throw new ScaffoldError(`target is not an existing directory: ${target}`);
  }

  const prototypesDir = path.join(targetDir, 'prototypes');
  if (existsSync(prototypesDir) && !lstatSync(prototypesDir).isDirectory()) {
    throw new ScaffoldError('prototypes exists in the target and is not a plain directory');
  }
  const destination = path.join(prototypesDir, name);
  // Defense in depth: the name pattern already rules out separators and dots.
  if (path.dirname(destination) !== prototypesDir) throw new ScaffoldError('name resolves outside prototypes/');
  if (existsSync(destination)) {
    const stat = lstatSync(destination);
    if (!stat.isDirectory() || readdirSync(destination).length > 0) {
      throw new ScaffoldError(`prototypes/${name}/ already exists and is not empty; choose another name`);
    }
  }

  const source = path.join(templatesDir, shape);
  const written = [];
  for (const rel of [...walk(source)].sort()) {
    const dir = path.dirname(rel);
    const base = path.basename(rel);
    const out = path.join(dir === '.' ? '' : dir, RENAMES[base] ?? base);
    const text = readFileSync(path.join(source, rel), 'utf8').replaceAll('{{name}}', name).replaceAll('{{date}}', date);
    const file = path.join(destination, out);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, { flag: 'wx' });
    written.push(out.split(path.sep).join('/'));
  }

  return { shape, name, directory: path.join('prototypes', name), files: written };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!['--shape', '--name', '--target'].includes(flag) || value === undefined || value.startsWith('--')) {
      throw new ScaffoldError(`usage: scaffold.mjs --shape ${SHAPES.join('|')} --name <kebab-name> --target <dir>`);
    }
    args[flag.slice(2)] = value;
  }
  return args;
}

function main() {
  try {
    console.log(JSON.stringify(scaffold(parseArgs(process.argv.slice(2))), null, 2));
  } catch (err) {
    if (!(err instanceof ScaffoldError)) throw err;
    console.error(`scaffold: ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
