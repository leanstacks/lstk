#!/usr/bin/env node
// PreToolUse hook (matcher: Edit|Write). Blocks edits to protected files.
//
// Defaults: .env and .env.* (but not .env.example, .env.sample, .env.template), package-lock.json,
// and anything under .git/. Add patterns with `protectedPatterns` in .claude/lstk.json, and remove
// a default or exempt a path with `unprotectPatterns`.
//
// Paths are resolved against cwd, `..` is collapsed, and symlinks are followed before matching,
// so traversal and links cannot dodge a pattern. Internal errors fail open (see lib/run.mjs).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { allow, deny, warn } from './lib/decision.mjs';
import { matchPattern, realpathDeepest, relativeTo, resolveTarget } from './lib/paths.mjs';
import { runHook } from './lib/run.mjs';

const TEMPLATE_ENV_FILES = ['.env.example', '.env.sample', '.env.template'];

/** Built-in patterns. `except` lists basenames a pattern does not apply to. */
const DEFAULTS = [
  { pattern: '.env' },
  { pattern: '.env.*', except: TEMPLATE_ENV_FILES },
  { pattern: 'package-lock.json' },
  { pattern: '.git/' },
];

function activePatterns(config) {
  const removed = new Set(config.unprotectPatterns);
  return [
    ...DEFAULTS.filter((d) => !removed.has(d.pattern)),
    ...config.protectedPatterns.map((pattern) => ({ pattern })),
  ];
}

/** The pattern that blocks this root-relative path, or undefined. */
function blockingPattern(rel, patterns, unprotect) {
  if (unprotect.some((u) => matchPattern(u, rel))) return undefined;
  const base = rel.split('/').pop();
  return patterns.find((p) => !p.except?.includes(base) && matchPattern(p.pattern, rel))?.pattern;
}

/**
 * Pure decision function. Returns { decision, reason? }.
 * @param {object} input hook input
 * @param {{ env?: object, warn?: (msg: string) => void }} [opts]
 */
export function evaluate(input, { env = process.env, warn: warnFn = warn } = {}) {
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath.trim() === '') return allow();

  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const root = path.resolve(env.CLAUDE_PROJECT_DIR || cwd);
  const config = loadConfig(root, warnFn);
  const patterns = activePatterns(config);

  const { lexical, real } = resolveTarget(filePath, cwd);
  const candidates = [relativeTo(root, lexical), relativeTo(realpathDeepest(root), real)];

  for (const rel of new Set(candidates)) {
    const pattern = blockingPattern(rel, patterns, config.unprotectPatterns);
    if (pattern) {
      return deny(
        `Blocked: \`${rel}\` matches protected pattern \`${pattern}\`. Protected files are changed by a human. ` +
          'Ask the user to make this edit, or to add the pattern to `unprotectPatterns` in `.claude/lstk.json`.',
      );
    }
  }
  return allow();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runHook('protect-files', (input) => evaluate(input));
}
