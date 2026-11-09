#!/usr/bin/env node
// Merge the lstk-guardrails permission snippets into a Claude Code settings.json.
// Node built-ins only.
//
//   node merge-settings.mjs --scope <user|project> [--include-convenience] [--dry-run]
//                           [--project-dir <dir>] [--settings-file <path>]
//
// Contract:
//   - Only permissions.deny, permissions.ask, and permissions.allow are touched. `hooks`, `model`,
//     `theme`, and every other key are preserved as they are, in their original order.
//   - Arrays are unioned and deduplicated. Existing entries keep their order and are never removed.
//     New entries are appended.
//   - Idempotent: when nothing is new, nothing is written.
//   - Refuses to write when the existing file is not valid JSON or has the wrong types.
//   - Writes atomically (temp file, then rename) and keeps a .bak of the original on the first change.
//   - Exit codes: 0 success or no changes, 1 refused (invalid input), 2 unexpected error.
import {
  copyFileSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const RULE_KEYS = ['deny', 'ask', 'allow'];

export class MergeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MergeError';
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Throw a MergeError unless permissions (if present) and its rule arrays have the right types. */
function assertShape(settings, label) {
  if (!isPlainObject(settings)) throw new MergeError(`${label} must be a JSON object`);
  if (!('permissions' in settings)) return;
  if (!isPlainObject(settings.permissions)) {
    throw new MergeError(`${label}: "permissions" must be an object`);
  }
  for (const key of RULE_KEYS) {
    if (key in settings.permissions && !Array.isArray(settings.permissions[key])) {
      throw new MergeError(`${label}: "permissions.${key}" must be an array`);
    }
  }
}

/**
 * Union the snippets' permission rules into a copy of `existing`.
 * @param {object} existing parsed settings
 * @param {object[]} snippets parsed snippet files
 * @returns {object} a new settings object. `existing` is not modified.
 */
export function mergeSettings(existing, snippets) {
  assertShape(existing, 'settings');
  const merged = structuredClone(existing);
  for (const [i, snippet] of snippets.entries()) {
    assertShape(snippet, `snippet ${i + 1}`);
    for (const key of RULE_KEYS) {
      const incoming = snippet.permissions?.[key];
      if (!incoming?.length) continue;
      merged.permissions ??= {};
      const list = (merged.permissions[key] ??= []);
      for (const rule of incoming) if (!list.includes(rule)) list.push(rule);
    }
  }
  return merged;
}

/** Entries present in b but not in a, per permissions array. Empty arrays are omitted. */
export function diffSettings(a, b) {
  const added = {};
  for (const key of RULE_KEYS) {
    const before = a?.permissions?.[key] ?? [];
    const fresh = (b?.permissions?.[key] ?? []).filter((rule) => !before.includes(rule));
    if (fresh.length) added[key] = fresh;
  }
  return added;
}

/** Does a rule, read as a glob over rule text, cover the other rule's text? Best effort. */
function covers(rule, other) {
  if (rule === other) return true;
  const source = rule
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`).test(other);
}

/**
 * Allow rules that a deny rule textually covers. Deny wins at runtime, so these allow rules
 * never take effect. This is a conservative textual and glob comparison, not a full evaluation.
 * @param {object} merged settings after merging
 * @param {string[]} [denyRules] limit the comparison to these deny rules (defaults to all of them)
 */
export function findConflicts(merged, denyRules) {
  const allow = merged?.permissions?.allow ?? [];
  const deny = denyRules ?? merged?.permissions?.deny ?? [];
  const conflicts = [];
  for (const a of allow) {
    const d = deny.find((rule) => typeof a === 'string' && typeof rule === 'string' && covers(rule, a));
    if (d !== undefined) conflicts.push({ allow: a, deny: d });
  }
  return conflicts;
}

function readJsonFile(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new MergeError(`${file} is not valid JSON (${err.message}). It was not changed.`);
  }
}

function writeAtomically(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, text);
    renameSync(temp, file);
  } catch (err) {
    rmSync(temp, { force: true });
    throw err;
  }
}

function formatDiff(added) {
  const lines = [];
  for (const [key, rules] of Object.entries(added)) {
    lines.push(`  permissions.${key}: ${rules.length} to add`);
    for (const rule of rules) lines.push(`    + ${rule}`);
  }
  return lines;
}

const USAGE =
  'usage: merge-settings.mjs --scope <user|project> [--include-convenience] [--dry-run] ' +
  '[--project-dir <dir>] [--settings-file <path>]';

/**
 * CLI entry point. Returns the exit code.
 * @param {string[]} argv arguments after the script name
 * @param {{ out?: (s: string) => void, err?: (s: string) => void, home?: string, snippetsDir?: string }} [io]
 */
export function run(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  const snippetsDir = io.snippetsDir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'snippets');

  try {
    let args;
    try {
      args = parseArgs({
        args: argv,
        options: {
          scope: { type: 'string' },
          'include-convenience': { type: 'boolean', default: false },
          'dry-run': { type: 'boolean', default: false },
          'project-dir': { type: 'string' },
          'settings-file': { type: 'string' },
        },
        allowPositionals: false,
      }).values;
    } catch (e) {
      err(`merge-settings: ${e.message}\n${USAGE}`);
      return 1;
    }

    if (args.scope !== undefined && args.scope !== 'user' && args.scope !== 'project') {
      err(`merge-settings: --scope must be "user" or "project"\n${USAGE}`);
      return 1;
    }
    if (!args.scope && !args['settings-file']) {
      err(`merge-settings: --scope is required\n${USAGE}`);
      return 1;
    }

    let target;
    if (args['settings-file']) {
      target = path.resolve(args['settings-file']);
    } else if (args.scope === 'user') {
      target = path.join(io.home ?? os.homedir(), '.claude', 'settings.json');
    } else {
      target = path.join(path.resolve(args['project-dir'] ?? process.cwd()), '.claude', 'settings.json');
    }

    const snippets = [readJsonFile(path.join(snippetsDir, 'baseline.json'))];
    if (args['include-convenience']) snippets.push(readJsonFile(path.join(snippetsDir, 'convenience.json')));
    if (snippets.includes(undefined)) throw new Error(`snippet files not found in ${snippetsDir}`);

    // Edit the real file when settings.json is a symlink, so the link is kept.
    const exists = existsSync(target);
    const file = exists ? realpathSync(target) : target;
    const existing = readJsonFile(file) ?? {};
    const merged = mergeSettings(existing, snippets);
    const added = diffSettings(existing, merged);
    const changed = Object.keys(added).length > 0;

    out(`Target: ${target}${exists ? '' : ' (does not exist yet)'}`);
    out(`Applying: baseline${args['include-convenience'] ? ' + convenience' : ''}`);

    if (changed) {
      out(args['dry-run'] ? 'Dry run. Would add:' : 'Adding:');
      for (const line of formatDiff(added)) out(line);
    } else {
      out('No changes. All rules are already present.');
    }

    const conflicts = findConflicts(
      merged,
      snippets.flatMap((s) => s.permissions?.deny ?? []),
    );
    if (conflicts.length) {
      out('Conflicts (best-effort textual check). Deny wins at runtime, so these allow rules never apply:');
      for (const c of conflicts) out(`  allow ${c.allow}  <-  deny ${c.deny}`);
    }

    if (!changed || args['dry-run']) {
      if (args['dry-run']) out('Dry run: nothing was written.');
      return 0;
    }

    if (exists) {
      try {
        copyFileSync(file, `${file}.bak`, constants.COPYFILE_EXCL);
        out(`Backup of the original: ${file}.bak`);
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
    }
    writeAtomically(file, `${JSON.stringify(merged, null, 2)}\n`);
    out('Done.');
    return 0;
  } catch (e) {
    if (e instanceof MergeError) {
      err(`merge-settings: ${e.message}`);
      return 1;
    }
    err(`merge-settings: unexpected error: ${e?.message ?? e}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run(process.argv.slice(2));
}
