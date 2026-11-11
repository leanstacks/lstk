import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');

// M4 review skills. Each body must have an output contract and a limits section, so a report can never
// claim more than it checked (PLAN-M4 F5). Grown per phase: architecture-review, threat-model,
// cdk-iam-review, and dependency-audit if built.
export const REVIEW_SKILLS_REQUIRE_SECTIONS = ['architecture-review', 'threat-model'];

describe('review skills', () => {
  it('lists only skills that exist', () => {
    for (const s of REVIEW_SKILLS_REQUIRE_SECTIONS) {
      expect(existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')), `unknown skill ${s}`).toBe(true);
    }
  });

  it.each(REVIEW_SKILLS_REQUIRE_SECTIONS)('%s has an output contract and a limits section', (skill) => {
    const body = readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
    expect(body).toMatch(/^#{1,3}\s+Output contract\s*$/m);
    expect(body).toMatch(/Not reviewed|Confidence and limits|^#{1,3}\s+Limits\s*$/m);
  });
});
