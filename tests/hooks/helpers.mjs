import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const matrix = JSON.parse(readFileSync(new URL('../fixtures/hook-matrix.json', import.meta.url), 'utf8'));

export const matrixRows = (hook) => matrix.filter((r) => r.hook === hook);

function substitute(value, tmp) {
  if (typeof value === 'string') return value.replaceAll('${TMP}', tmp);
  if (Array.isArray(value)) return value.map((v) => substitute(v, tmp));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, tmp)]));
  }
  return value;
}

/** Build the row's setup recipe in a temp dir and call fn(input, tmp). Cleans up afterwards. */
export function withRow(row, fn) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'lstk-hook-'));
  try {
    for (const [rel, content] of Object.entries(row.setup?.files ?? {})) {
      mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
      writeFileSync(path.join(tmp, rel), content);
    }
    for (const [link, target] of Object.entries(row.setup?.symlinks ?? {})) {
      symlinkSync(target, path.join(tmp, link));
    }
    return fn(substitute(row.input, tmp), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
