import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const AGENTS_DIR = path.join(ROOT, 'plugins/lstk/agents');
const EVALS_DIR = path.join(ROOT, 'tests/evals');

// Agents that must ship an eval file. Grown per phase. An agent eval file uses the key `agent` instead of `skill`.
const AGENT_EVALS_REQUIRED = [];

const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const agents = existsSync(AGENTS_DIR)
  ? readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  : [];

function expectWellFormed(file, key, name) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  expect(data[key]).toBe(name);
  expect(Object.keys(data).filter((k) => k === 'skill' || k === 'agent')).toEqual([key]);
  expect(Array.isArray(data.prompts)).toBe(true);
  expect(data.prompts.length).toBeGreaterThanOrEqual(3);
  const ids = new Set();
  for (const p of data.prompts) {
    for (const k of ['id', 'prompt', 'note']) {
      expect(typeof p[k], `${p.id ?? '?'}.${k}`).toBe('string');
      expect(p[k].trim(), `${p.id ?? '?'}.${k}`).not.toBe('');
    }
    expect(typeof p.shouldTrigger).toBe('boolean');
    expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
    ids.add(p.id);
  }
  expect(data.prompts.some((p) => p.shouldTrigger)).toBe(true);
  expect(data.prompts.some((p) => !p.shouldTrigger)).toBe(true);
}

describe('agent evals', () => {
  it('lists only agents that exist', () => {
    for (const a of AGENT_EVALS_REQUIRED) expect(agents.includes(a), `unknown agent ${a}`).toBe(true);
  });

  it.each(AGENT_EVALS_REQUIRED)('%s has a well-formed eval file', (agent) => {
    const file = path.join(EVALS_DIR, `${agent}.json`);
    expect(existsSync(file)).toBe(true);
    expectWellFormed(file, 'agent', agent);
  });
});

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
      expectWellFormed(file, 'skill', skill);
    });
  });
});
