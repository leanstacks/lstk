import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = path.join(ROOT, 'plugins/lstk/skills/plan-author');
const read = (rel) => readFileSync(path.join(SKILL_DIR, rel), 'utf8');

// The plan-author contract (PLAN-0023 Phase 2). Renaming or dropping one must fail a test.
export const PHASE_PLAN_H2 = [
  '1. Scope',
  '2. Findings and decisions',
  '3. Execution order',
  '4. Phases',
  '5. Exit checklist',
  '6. Risks specific to this plan',
];
export const PHASE_PARTS = [
  '**Goal:**',
  '**Context to load:**',
  '| Step | Work',
  '**Done when:**',
  '**Status:**',
  '**As built (fill in at the end of the phase)**',
  '**Handoff to the next phase (write at phase end):**',
];
export const MILESTONE_H2 = [
  'Ground rules (apply to every milestone)',
  'Milestone overview',
  'M0: <name>',
  'Cross-cutting risks and where they are handled',
  'Open items to settle during detailed planning',
  'How to use this plan',
];
export const MILESTONE_PARTS = [
  '**Goal:**',
  '**Scope**',
  '**Out of scope**',
  '**Dependencies:**',
  '**Deliverables:**',
  '**Exit criteria:**',
  '**Risks and spikes:**',
  '**Inputs for detailed planning:**',
];

/** The fenced template block (four backticks) from a template file. */
const templateBlock = (text) => text.match(/^````markdown\n([\s\S]*?)^````$/m)?.[1] ?? '';

const h2 = (text) => [...text.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);

/** The first element of `expected` that is missing or out of order in `actual`, or null when all appear in order. */
export function firstOutOfOrder(expected, actual) {
  let from = 0;
  for (const item of expected) {
    const at = actual.indexOf(item, from);
    if (at === -1) return item;
    from = at + 1;
  }
  return null;
}

describe('firstOutOfOrder', () => {
  it('accepts an ordered subset', () => expect(firstOutOfOrder(['a', 'c'], ['a', 'b', 'c'])).toBeNull());
  it('reports a missing item', () => expect(firstOutOfOrder(['a', 'z'], ['a', 'b'])).toBe('z'));
  it('reports a misordered item', () => expect(firstOutOfOrder(['b', 'a'], ['a', 'b'])).toBe('a'));
});

describe('plan-author SKILL.md', () => {
  const skill = read('SKILL.md');
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/)[1];

  it('is user-invoked only', () => {
    expect(frontmatter).toMatch(/^disable-model-invocation:\s*true\s*$/m);
  });

  it('allows only file tools', () => {
    const tools = frontmatter
      .match(/^allowed-tools:\s*(.+)$/m)[1]
      .split(',')
      .map((t) => t.trim());
    expect(tools.sort()).toEqual(['Edit', 'Glob', 'Grep', 'Read', 'Write']);
    expect(frontmatter.match(/^allowed-tools:.*$/m)[0]).not.toMatch(/WebFetch|Bash|git/i);
  });

  it('links its three reference files', () => {
    for (const f of ['phase-template.md', 'milestone-template.md', 'index-handling.md']) {
      expect(skill).toContain(`references/${f}`);
    }
  });

  it('says plan mode blocks the write', () => {
    expect(skill).toMatch(/plan mode/i);
    expect(skill).toMatch(/leave plan mode/i);
  });
});

describe('phase template', () => {
  const text = read('references/phase-template.md');
  const block = templateBlock(text);

  it('has a template block', () => expect(block).not.toBe(''));

  it('lists the plan sections, in order', () => {
    expect(firstOutOfOrder(PHASE_PLAN_H2, h2(block))).toBeNull();
  });

  it('lists the header fields, in order', () => {
    const at = ['**Source:**', '**Branch:**', '**Starting state:**', '**Goal:**'].map((f) => block.indexOf(f));
    expect(at.every((n, i) => n >= 0 && (i === 0 || n > at[i - 1]))).toBe(true);
  });

  it('lists each phase part, in order', () => {
    const phase = block.slice(block.indexOf('### Phase 1'), block.indexOf('## 5.'));
    const at = PHASE_PARTS.map((p) => phase.indexOf(p));
    expect(
      at.every((n, i) => n >= 0 && (i === 0 || n > at[i - 1])),
      PHASE_PARTS.join(' > '),
    ).toBe(true);
  });

  it('states the sizing rule and the begin and end rules', () => {
    expect(text).toMatch(/one phase is one clean agentic session/i);
    expect(block).toMatch(/begins by reading this plan and the previous handoff/);
    expect(block).toMatch(/Do not commit until the user has reviewed/);
  });
});

describe('milestone template', () => {
  const text = read('references/milestone-template.md');
  const block = templateBlock(text);

  it('lists the plan sections, in order', () => {
    expect(firstOutOfOrder(MILESTONE_H2, h2(block))).toBeNull();
  });

  it('lists each milestone part, in order', () => {
    const part = block.slice(block.indexOf('## M0:'), block.indexOf('## Cross-cutting'));
    const at = MILESTONE_PARTS.map((p) => part.indexOf(p));
    expect(
      at.every((n, i) => n >= 0 && (i === 0 || n > at[i - 1])),
      MILESTONE_PARTS.join(' > '),
    ).toBe(true);
  });

  it('names the gate "Exit criteria", not "Acceptance"', () => {
    expect(block).toContain('**Exit criteria:**');
    expect(block).not.toMatch(/Acceptance/);
  });
});

describe('index handling', () => {
  const text = read('references/index-handling.md');

  it('never creates an index unasked', () => {
    expect(text).toMatch(/never creates an index/i);
    expect(text).toMatch(/Never create it unasked/);
  });

  it('states the detection order', () => {
    const at = ['docs/plans/README.md', 'docs/plans/index.md', 'AGENTS.md'].map((s) => text.indexOf(s));
    expect(at.every((n, i) => n >= 0 && (i === 0 || n > at[i - 1]))).toBe(true);
  });

  it('adds one row with status Draft', () => {
    expect(text).toMatch(/single `Edit`/);
    expect(text).toMatch(/Status for a new plan is `Draft`/);
  });
});
