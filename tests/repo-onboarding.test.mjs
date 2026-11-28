import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = path.join(ROOT, 'plugins/lstk/skills/repo-onboarding');
const read = (rel) => readFileSync(path.join(SKILL_DIR, rel), 'utf8');

// The repo-onboarding template contract (PLAN-0022 Phase 3). Renaming or dropping one must fail a test.
export const REQUIRED_H2 = [
  'Purpose',
  'Architecture and data flow',
  'Repository structure',
  'Central contracts and invariants',
  'Tech stack',
  'Where to go next',
  'Open questions',
];
const AUDIENCE_LINE = '> For humans and coding agents.';

const templateBlock = (text) => text.match(/^```markdown\n([\s\S]*?)^```$/m)?.[1] ?? '';

describe('repo-onboarding contract', () => {
  it('ships architecture-template.md and no old overview template', () => {
    const files = readdirSync(path.join(SKILL_DIR, 'references'));
    expect(files).toContain('architecture-template.md');
    expect(files).not.toContain('overview-template.md');
  });

  const block = templateBlock(read('references/architecture-template.md'));

  it('has a fenced template block with the title and audience line', () => {
    expect(block).not.toBe('');
    expect(block).toMatch(/^# <Project Name>: Architecture$/m);
    expect(block).toContain(AUDIENCE_LINE);
  });

  it('has the required headings in order', () => {
    const h2 = [...block.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
    let from = 0;
    for (const heading of REQUIRED_H2) {
      const at = h2.indexOf(heading, from);
      expect(at, `missing or out of order: ${heading}`).toBeGreaterThanOrEqual(0);
      from = at + 1;
    }
  });

  it('has no setup or workflow sections of its own', () => {
    expect(block).not.toMatch(/^## (Getting started|Development workflow)/m);
  });

  describe('SKILL.md', () => {
    const skill = read('SKILL.md');

    it('writes docs/ARCHITECTURE.md and keeps the purpose check', () => {
      expect(skill).toContain('docs/ARCHITECTURE.md');
      expect(skill).toContain('Purpose check');
    });

    it('names PROJECT_OVERVIEW.md only as a legacy name', () => {
      for (const line of skill.split('\n').filter((l) => l.includes('PROJECT_OVERVIEW'))) {
        expect(line, line).toMatch(/legacy/i);
      }
    });

    it('links only to files that exist', () => {
      const refs = new Set([...skill.matchAll(/`(references\/[\w.-]+\.md)`/g)].map((m) => m[1]));
      expect(refs.size).toBeGreaterThan(0);
      for (const rel of refs) expect(existsSync(path.join(SKILL_DIR, rel)), rel).toBe(true);
    });
  });
});
