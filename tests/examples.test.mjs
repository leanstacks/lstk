import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const EXAMPLES_DIR = path.join(ROOT, 'docs/examples');

// Skills that must ship a worked example in docs/examples/<skill>.md. Grown phase by phase so the
// check never blocks an in-progress phase. Reference-only skills (stack-profile) are never listed.
const EXAMPLES_REQUIRED = [
  'tech-eval',
  'adr-author',
  'solution-outline',
  'architecture-review',
  'threat-model',
  'cdk-iam-review',
];

// The code-reviewer agent defines its report format in the agent prompt and has no template file, so
// its contract headings are listed here (PLAN-M4 7.3).
const AGENT_EXAMPLES = {
  'code-reviewer': ['Scope', 'Summary', 'Findings', 'Test gaps', 'Questions for the author', 'Not reviewed'],
};

// Review skills whose examples must follow the contract headings in references/output-template.md.
const CONTRACT_SKILLS = ['architecture-review', 'threat-model', 'cdk-iam-review'];

const h2 = (text) => [...text.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);

// True when `expected` appears in `actual` in the same order (extra headings in between are allowed).
const inOrder = (expected, actual) => {
  let i = 0;
  for (const h of actual) if (h === expected[i]) i += 1;
  return i === expected.length;
};

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

  it.each(CONTRACT_SKILLS)('%s example follows its output contract headings in order', (skill) => {
    const template = readFileSync(path.join(SKILLS_DIR, skill, 'references/output-template.md'), 'utf8');
    const example = readFileSync(path.join(EXAMPLES_DIR, `${skill}.md`), 'utf8');
    const expected = h2(template);
    expect(expected.length, `no contract headings in ${skill} template`).toBeGreaterThan(0);
    expect(inOrder(expected, h2(example)), `${skill}.md headings vs ${expected.join(' > ')}`).toBe(true);
  });

  it.each(Object.keys(AGENT_EXAMPLES))('%s agent example follows its report format in order', (agent) => {
    expect(existsSync(path.join(ROOT, 'plugins/lstk/agents', `${agent}.md`))).toBe(true);
    const example = readFileSync(path.join(EXAMPLES_DIR, `${agent}.md`), 'utf8');
    expect(inOrder(AGENT_EXAMPLES[agent], h2(example))).toBe(true);
  });
});
