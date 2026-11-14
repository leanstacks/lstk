import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../scripts/lint-plugins.mjs';

// Keeps the user guides honest as skills change (PLAN-M6 Phase 1, step 1.5). The guides in
// docs/guides/ and the README are the only files checked. Every check passes on an empty docs/guides/.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES_DIR = path.join(ROOT, 'docs/guides');
const LSTK_SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const LSTK_AGENTS_DIR = path.join(ROOT, 'plugins/lstk/agents');
const GUARDRAILS_SKILLS_DIR = path.join(ROOT, 'plugins/lstk-guardrails/skills');

const dirNames = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

const lstkSkills = dirNames(LSTK_SKILLS_DIR);
const guardrailSkills = dirNames(GUARDRAILS_SKILLS_DIR);
const agents = readdirSync(LSTK_AGENTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

// Skills with `user-invocable: false` are background knowledge, not something a user runs.
const userInvocable = (skill) => {
  const text = readFileSync(path.join(LSTK_SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
  return parseFrontmatter(text)?.data['user-invocable'] !== 'false';
};
const userSkills = lstkSkills.filter(userInvocable);

const guideFiles = existsSync(GUIDES_DIR)
  ? readdirSync(GUIDES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(GUIDES_DIR, f))
  : [];
const checked = [path.join(ROOT, 'README.md'), ...guideFiles];
const rel = (file) => path.relative(ROOT, file);

/** Remove fenced code blocks (including Mermaid) and inline code spans, so their text is never read as a link. */
export const stripCode = (text) => text.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '').replace(/`[^`\n]*`/g, '');

/** Relative link targets in Markdown, without anchors. External links and in-page anchors are skipped. */
export const relativeLinks = (text) =>
  [...stripCode(text).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((m) => m[1])
    .filter((target) => !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target))
    .map((target) => decodeURIComponent(target.split('#')[0]))
    .filter(Boolean);

const hasWord = (text, word) => new RegExp(`(?<![\\w-])${word}(?![\\w-])`).test(text);

describe('guide test helpers', () => {
  it('ignores links inside code fences, Mermaid blocks, and inline code', () => {
    const text = ['[ok](docs/a.md)', '```mermaid', 'A --> B["[x](nope.md)"]', '```', '`[y](nope2.md)`'].join('\n');
    expect(relativeLinks(text)).toEqual(['docs/a.md']);
  });

  it('skips external links and in-page anchors, and strips file anchors', () => {
    const text = '[a](https://x.dev) [b](#top) [c](mailto:a@b.c) [d](docs/f.md#sec)';
    expect(relativeLinks(text)).toEqual(['docs/f.md']);
  });
});

describe('docs inventory', () => {
  it('finds the skills and agents the guides describe', () => {
    expect(userSkills.length).toBeGreaterThanOrEqual(13);
    expect(agents.sort()).toEqual(['code-reviewer', 'researcher']);
    expect(guardrailSkills).toContain('init');
  });
});

describe('guide links', () => {
  it.each(checked.map((f) => [rel(f), f]))('%s: every relative link resolves', (_name, file) => {
    for (const target of relativeLinks(readFileSync(file, 'utf8'))) {
      const resolved = path.resolve(path.dirname(file), target);
      expect(existsSync(resolved), `${rel(file)} links to ${target}, which does not exist`).toBe(true);
    }
  });
});

describe('skill and agent references', () => {
  // `/lstk:<name>` is a skill or, written without the slash, a plugin agent (`lstk:code-reviewer`).
  const REFERENCE = /(?<![\w-])\/?(lstk-guardrails|lstk):([a-z0-9]+(?:-[a-z0-9]+)*)/g;

  it.each(checked.map((f) => [rel(f), f]))('%s: every plugin-qualified name exists', (_name, file) => {
    // Prompts live in code fences, so references are read from the raw text.
    for (const [, plugin, name] of readFileSync(file, 'utf8').matchAll(REFERENCE)) {
      const known = plugin === 'lstk' ? [...lstkSkills, ...agents] : guardrailSkills;
      expect(known, `${rel(file)} names ${plugin}:${name}, which does not exist`).toContain(name);
    }
  });

  it('README mentions every user-invocable skill and agent (the single skill table, F4)', () => {
    const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    for (const name of [...userSkills, ...agents]) {
      expect(hasWord(readme, name), `README.md does not mention ${name}`).toBe(true);
    }
  });
});

describe('lifecycle map', () => {
  const lifecycle = path.join(GUIDES_DIR, 'lifecycle.md');
  // Skipped until Phase 2 creates the file, so this passes on an empty docs/guides/.
  it.skipIf(!existsSync(lifecycle))('mentions every user-invocable skill and agent', () => {
    const text = readFileSync(lifecycle, 'utf8');
    for (const name of [...userSkills, ...agents]) {
      expect(hasWord(text, name), `lifecycle.md does not mention ${name}`).toBe(true);
    }
  });

  const gettingStarted = path.join(GUIDES_DIR, 'getting-started.md');
  it.skipIf(!existsSync(gettingStarted))('getting-started covers the guardrails init skill', () => {
    expect(readFileSync(gettingStarted, 'utf8')).toContain('/lstk-guardrails:init');
  });
});

// F5: the guides never tell a user to weaken a guardrail. A line may mention these only as a "never" rule.
// Same pattern as the M5 wording test in prototype-skills.test.mjs.
export const GUARDRAIL_WEAKENING =
  /disabl\w*\s+(?:a\s+|the\s+|any\s+|your\s+)?(?:lstk[- ]?guardrails?\s+)?hooks?\b|~\/\.claude\/settings(?:\.local)?\.json|settings\.json|dangerously-skip-permissions|bypassPermissions|unprotectPatterns/i;

describe('guides and guardrails', () => {
  it.each([
    ['disable a hook', true],
    ['Disable the hooks first', true],
    ['edit ~/.claude/settings.json', true],
    ['run with --dangerously-skip-permissions', true],
    ['add it to unprotectPatterns', true],
    ['Read the block message and ask the human', false],
  ])('pattern check: %s', (line, hit) => {
    expect(GUARDRAIL_WEAKENING.test(line)).toBe(hit);
  });

  it.each(guideFiles.map((f) => [rel(f), f]))(
    '%s: mentions guardrail-weakening steps only in a "never" rule',
    (_n, file) => {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (GUARDRAIL_WEAKENING.test(line)) {
          expect(line, `${rel(file)}: ${line}`).toMatch(/\b(never|do not|don't|not)\b/i);
        }
      }
    },
  );
});
