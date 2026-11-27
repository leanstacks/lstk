import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLANS_DIR = path.join(ROOT, 'docs/plans');

/**
 * Plan files linked from the rows of the index tables in a plans README.
 * Only the first link in a row's first cell counts.
 * @param {string} readme
 * @returns {string[]} link targets, such as `PLAN-M0.md`
 */
export function indexedPlans(readme) {
  const targets = [];
  for (const line of readme.split('\n')) {
    if (!line.startsWith('|')) continue;
    const first = line.split('|')[1] ?? '';
    const link = first.match(/\[[^\]]+\]\(([^)]+)\)/);
    if (link) targets.push(link[1]);
  }
  return targets;
}

describe('indexedPlans', () => {
  it('reads the link in the first cell of each row', () => {
    const md = '| Plan | Source |\n| --- | --- |\n| [PLAN-1](PLAN-1.md) | [PLAN-2](PLAN-2.md) §5 |\nprose [x](x.md)';
    expect(indexedPlans(md)).toEqual(['PLAN-1.md']);
  });
});

describe('docs/plans/README.md', () => {
  const readme = readFileSync(path.join(PLANS_DIR, 'README.md'), 'utf8');
  const indexed = indexedPlans(readme);
  const files = readdirSync(PLANS_DIR).filter((f) => /^PLAN-.+\.md$/.test(f));

  it('has a row for every plan file', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(indexed, `${f} has no row in docs/plans/README.md`).toContain(f);
  });

  it('links every row to a file that exists', () => {
    for (const target of indexed) {
      expect(existsSync(path.join(PLANS_DIR, target)), `${target} does not exist`).toBe(true);
    }
  });

  it('lists no plan twice', () => {
    expect(new Set(indexed).size).toBe(indexed.length);
  });
});
