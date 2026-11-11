import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const EXAMPLES_DIR = path.join(ROOT, 'docs/examples');

// Skills that must ship a worked example in docs/examples/<skill>.md. Grown phase by phase so the
// check never blocks an in-progress phase. Reference-only skills (stack-profile) are never listed.
const EXAMPLES_REQUIRED = ['tech-eval', 'adr-author', 'solution-outline'];

const skills = new Set(
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name),
);

describe('worked examples', () => {
  it('lists only skills that exist', () => {
    for (const skill of EXAMPLES_REQUIRED) expect(skills.has(skill), `unknown skill ${skill}`).toBe(true);
  });

  it('has a docs/examples file for every required skill', () => {
    for (const skill of EXAMPLES_REQUIRED) {
      expect(existsSync(path.join(EXAMPLES_DIR, `${skill}.md`)), `docs/examples/${skill}.md`).toBe(true);
    }
  });
});
