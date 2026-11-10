// Load .claude/lstk.json (and the uncommitted .claude/lstk.local.json) from the project root.
// Node built-ins only. A bad config never crashes the hook: warn and fall back to the defaults.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILES = ['lstk.json', 'lstk.local.json'];
const KEYS = ['protectedPatterns', 'unprotectPatterns'];

function readOne(file, warn) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
      warn(`lstk-guardrails: cannot read ${file} (${err.message}); using defaults`);
    }
    return {};
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    warn(`lstk-guardrails: ${file} is not valid JSON (${err.message}); ignoring it`);
    return {};
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    warn(`lstk-guardrails: ${file} must contain a JSON object; ignoring it`);
    return {};
  }

  const out = {};
  for (const key of KEYS) {
    if (!(key in json)) continue;
    const value = json[key];
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v.trim() === '')) {
      warn(`lstk-guardrails: ${file} "${key}" must be an array of non-empty strings; ignoring it`);
      continue;
    }
    out[key] = value.filter((v) => {
      if (v.startsWith('!')) {
        warn(`lstk-guardrails: ${file} pattern "${v}" ignored; negation is not supported (use unprotectPatterns)`);
        return false;
      }
      return true;
    });
  }
  return out;
}

/**
 * @param {string} root project root
 * @param {(msg: string) => void} warn
 * @returns {{ protectedPatterns: string[], unprotectPatterns: string[] }}
 */
export function loadConfig(root, warn = () => {}) {
  const merged = { protectedPatterns: [], unprotectPatterns: [] };
  for (const name of FILES) {
    const one = readOne(path.join(root, '.claude', name), warn);
    for (const key of KEYS) merged[key].push(...(one[key] ?? []));
  }
  return merged;
}
