import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const EVALS_DIR = path.join(ROOT, 'tests/evals');

const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

describe('trigger evals', () => {
  it('finds skills to check', () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  describe.each(skills)('%s', (skill) => {
    const file = path.join(EVALS_DIR, `${skill}.json`);

    it('has an eval file', () => {
      expect(existsSync(file)).toBe(true);
    });

    it('is well formed', () => {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      expect(data.skill).toBe(skill);
      expect(Array.isArray(data.prompts)).toBe(true);
      expect(data.prompts.length).toBeGreaterThanOrEqual(3);
      const ids = new Set();
      for (const p of data.prompts) {
        for (const key of ['id', 'prompt', 'note']) {
          expect(typeof p[key], `${p.id ?? '?'}.${key}`).toBe('string');
          expect(p[key].trim(), `${p.id ?? '?'}.${key}`).not.toBe('');
        }
        expect(typeof p.shouldTrigger).toBe('boolean');
        expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
        ids.add(p.id);
      }
      expect(data.prompts.some((p) => p.shouldTrigger)).toBe(true);
      expect(data.prompts.some((p) => !p.shouldTrigger)).toBe(true);
    });
  });
});
