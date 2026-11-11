import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/sample-repo');
const KEY = path.join(FIXTURE, 'SEEDED-ISSUES.md');

// Rows look like: | SI-01 | text | `path:line` | `anchor` | who |
const ROW = /^\|\s*(SI-\d+)\s*\|[^|]*\|\s*`([^`:]+):(\d+)`\s*\|\s*`([^`]+)`\s*\|/;

const rows = readFileSync(KEY, 'utf8')
  .split(/\r?\n/)
  .map((line) => ROW.exec(line))
  .filter(Boolean)
  .map(([, id, file, line, anchor]) => ({ id, file, line: Number(line), anchor }));

describe('review fixture answer key', () => {
  it('lists seeded issues', () => {
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  describe.each(rows)('$id', ({ file, line, anchor }) => {
    it(`has "${anchor}" at ${file}:${line}`, () => {
      const target = path.join(FIXTURE, file);
      expect(existsSync(target), `${file} exists`).toBe(true);
      const lines = readFileSync(target, 'utf8').split(/\r?\n/);
      expect(line).toBeLessThanOrEqual(lines.length);
      expect(lines[line - 1]).toContain(anchor);
    });
  });

  it('keeps the missing test missing (SI-06)', () => {
    expect(existsSync(path.join(FIXTURE, 'tests/cancel-order.test.ts'))).toBe(false);
    expect(existsSync(path.join(FIXTURE, 'tests/create-order.test.ts'))).toBe(true);
  });

  it('contains only placeholder account IDs', () => {
    const files = ['infra/bin/app.ts', 'infra/lib/orders-stack.ts', 'README.md', 'AGENTS.md', 'SEEDED-ISSUES.md'];
    for (const f of files) {
      const text = readFileSync(path.join(FIXTURE, f), 'utf8');
      for (const id of text.match(/\b\d{12}\b/g) ?? []) expect(id, `${f}: ${id}`).toBe('111111111111');
    }
  });

  it('has no credential-shaped strings', () => {
    const files = ['infra/bin/app.ts', 'infra/lib/orders-stack.ts', 'src/handlers/cancel-order.ts', 'package.json'];
    for (const f of files) {
      const text = readFileSync(path.join(FIXTURE, f), 'utf8');
      expect(text, f).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(text, f).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    }
  });
});
