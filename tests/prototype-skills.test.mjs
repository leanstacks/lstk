import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'plugins/lstk/skills');
const TEMPLATES_DIR = path.join(SKILLS_DIR, 'prototype/templates');

// M5 skills. Each body must have an output contract and a limits section (PLAN-M5 F7). Grown per phase:
// `prototype` in Phase 3, `promote-prototype` in Phase 4. Starts empty so an in-progress phase never fails.
export const PROTOTYPE_SKILLS_REQUIRE_SECTIONS = ['prototype', 'promote-prototype'];

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
// An exact version, with an optional prerelease suffix. Ranges, tags, URLs, and `latest` are not pins.
const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * Dependencies in a parsed package.json that are not pinned to an exact version (PLAN-M5 Q2).
 * @param {Record<string, unknown>} pkg
 * @returns {string[]} entries such as `react@^18.0.0`
 */
export function unpinnedDependencies(pkg) {
  const found = [];
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, version] of Object.entries(pkg[field] ?? {})) {
      if (typeof version !== 'string' || !EXACT_VERSION.test(version)) found.push(`${name}@${version}`);
    }
  }
  return found;
}

function* walk(dir) {
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name === 'node_modules') continue;
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('prototype skills', () => {
  it('lists only skills that exist', () => {
    for (const s of PROTOTYPE_SKILLS_REQUIRE_SECTIONS) {
      expect(existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')), `unknown skill ${s}`).toBe(true);
    }
  });

  it.each(PROTOTYPE_SKILLS_REQUIRE_SECTIONS)('%s has an output contract and a limits section', (skill) => {
    const body = readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
    expect(body).toMatch(/^#{1,3}\s+Output contract\s*$/m);
    expect(body).toMatch(/Not reviewed|Confidence and limits|^#{1,3}\s+Limits\s*$/m);
  });
});

describe('unpinnedDependencies', () => {
  it.each([
    [{ dependencies: { react: '19.1.0' } }, []],
    [{ devDependencies: { vitest: '5.1.0', typescript: '5.9.2-rc.1' } }, []],
    [{ dependencies: { react: '^19.1.0' } }, ['react@^19.1.0']],
    [{ devDependencies: { vite: '~7.0.0' } }, ['vite@~7.0.0']],
    [
      { dependencies: { a: 'latest', b: '*', c: '>=1', d: '19', e: 'github:x/y' } },
      ['a@latest', 'b@*', 'c@>=1', 'd@19', 'e@github:x/y'],
    ],
    [{ peerDependencies: { react: '^19' } }, ['react@^19']],
    [{ name: 'no-deps' }, []],
  ])('%j', (pkg, expected) => {
    expect(unpinnedDependencies(pkg)).toEqual(expected);
  });
});

const TEMPLATE_SHAPES = ['web', 'lambda'];
const PROTOTYPE_SECTIONS = [
  'Status',
  'Purpose',
  'How to run',
  'What is faked',
  'Known shortcuts',
  'Not covered',
  'Promotion',
];
const THROWAWAY_HEADER = 'Throwaway prototype. Not production code.';
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.html'];

describe('prototype template structure', () => {
  it('has exactly the web and lambda shapes', () => {
    const shapes = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(shapes.sort()).toEqual([...TEMPLATE_SHAPES].sort());
  });

  describe.each(TEMPLATE_SHAPES)('%s', (shape) => {
    const dir = path.join(TEMPLATES_DIR, shape);
    const files = [...walk(dir)].map((f) => path.relative(dir, f).split(path.sep).join('/'));

    it('has PROTOTYPE.md with the contract sections, in order', () => {
      const text = readFileSync(path.join(dir, 'PROTOTYPE.md'), 'utf8');
      expect(text.split('\n')[0]).toBe('# {{name}}');
      const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      expect(headings).toEqual(PROTOTYPE_SECTIONS);
      expect(text).toMatch(/^## Status\n\nThrowaway prototype\. Not production code\./m);
      expect(text).toContain('/lstk:promote-prototype');
    });

    it('starts every source file with the throwaway header', () => {
      const sources = files.filter((f) => SOURCE_EXTENSIONS.includes(path.extname(f)));
      expect(sources.length).toBeGreaterThan(0);
      for (const rel of sources) {
        const head = readFileSync(path.join(dir, rel), 'utf8').split('\n').slice(0, 2).join('\n');
        expect(head, rel).toContain(THROWAWAY_HEADER);
      }
    });

    it('ships _gitignore, no .gitignore, no lockfile, and no env file', () => {
      expect(files).toContain('_gitignore');
      expect(files).not.toContain('.gitignore');
      expect(files.filter((f) => /(^|\/)(package-lock\.json|\.env(\..*)?)$/.test(f))).toEqual([]);
    });

    it('references nothing outside its own directory', () => {
      for (const rel of files) {
        expect(readFileSync(path.join(dir, rel), 'utf8'), rel).not.toMatch(/\.\.\/\.\.\//);
      }
    });

    it('has a package.json named by the placeholder', () => {
      expect(JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name).toBe('{{name}}');
    });
  });

  it('the Lambda PROTOTYPE.md says it is not deployed', () => {
    expect(readFileSync(path.join(TEMPLATES_DIR, 'lambda/PROTOTYPE.md'), 'utf8')).toMatch(/Not deployed/);
  });
});

describe('prototype templates', () => {
  const packages = existsSync(TEMPLATES_DIR)
    ? [...walk(TEMPLATES_DIR)].filter((f) => path.basename(f) === 'package.json')
    : [];

  it('finds one package.json per shape', () => {
    expect(packages).toHaveLength(TEMPLATE_SHAPES.length);
  });

  it.each(packages.map((f) => path.relative(TEMPLATES_DIR, f)))('%s pins every dependency', (rel) => {
    const pkg = JSON.parse(readFileSync(path.join(TEMPLATES_DIR, rel), 'utf8'));
    expect(unpinnedDependencies(pkg)).toEqual([]);
  });
});

const GAP_SECTIONS = [
  'Scope and sources',
  'Summary',
  'What is faked',
  'Gaps',
  'Promotion order',
  'Hand-offs',
  'Not reviewed',
  'Confidence and limits',
];
const GAP_COLUMNS = ['id', 'category', 'gap', 'location', 'evidence', 'effort', 'confidence'];

describe('promote-prototype output template', () => {
  const dir = path.join(SKILLS_DIR, 'promote-prototype');
  const template = readFileSync(path.join(dir, 'references/output-template.md'), 'utf8');
  const skill = readFileSync(path.join(dir, 'SKILL.md'), 'utf8');

  it('has the contract sections, in order', () => {
    expect([...template.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(GAP_SECTIONS);
  });

  it('has the gap table columns, in order', () => {
    const header = template.split('\n').find((l) => /^\| id\s/.test(l));
    expect(
      header
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    ).toEqual(GAP_COLUMNS);
  });

  it('names the same sections and columns in SKILL.md', () => {
    for (const s of GAP_SECTIONS) expect(skill).toContain(`\`${s}\``);
    expect(skill).toContain(GAP_COLUMNS.map((c) => `\`${c}\``).join(', '));
  });

  it('never uses the banned verdict words outside a "never" rule', () => {
    for (const line of skill.split('\n')) {
      if (/\b(ready|secure|compliant|complete)\b/i.test(line)) expect(line, line).toMatch(/never|not|no /i);
    }
  });
});

// F1: the skills never tell a user to weaken a guardrail. A line may mention these only as a "never" rule.
const GUARDRAIL_WEAKENING =
  /disabl\w*\s+(?:a\s+|the\s+|any\s+|your\s+)?(?:lstk[- ]?guardrails?\s+)?hooks?\b|~\/\.claude\/settings(?:\.local)?\.json|settings\.json|dangerously-skip-permissions|bypassPermissions|unprotectPatterns/i;

describe('prototype skills and guardrails', () => {
  const files = ['prototype', 'promote-prototype'].flatMap((skill) => {
    const dir = path.join(SKILLS_DIR, skill);
    return [...walk(dir)].filter((f) => f.endsWith('.md') && !f.includes(`${path.sep}templates${path.sep}`));
  });

  it('finds the skill files', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each([
    ['disable a hook', true],
    ['Disable the hooks first', true],
    ['edit ~/.claude/settings.json', true],
    ['run with --dangerously-skip-permissions', true],
    ['add it to unprotectPatterns', true],
    ['Report the block and stop', false],
  ])('pattern check: %s', (line, hit) => {
    expect(GUARDRAIL_WEAKENING.test(line)).toBe(hit);
  });

  it('mentions guardrail-weakening steps only in a "never" rule', () => {
    for (const file of files) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (GUARDRAIL_WEAKENING.test(line)) {
          expect(line, `${path.relative(ROOT, file)}: ${line}`).toMatch(/\b(never|do not|don't|not)\b/i);
        }
      }
    }
  });
});
