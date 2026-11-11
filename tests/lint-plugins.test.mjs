import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { lintRepo, parseFrontmatter } from '../scripts/lint-plugins.mjs';

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDirs = [];

function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

/** Build a valid two-plugin scaffold in a temp dir and return its root. */
function makeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'lstk-lint-'));
  tmpDirs.push(root);
  write(root, '.claude-plugin/marketplace.json', {
    name: 'lstk',
    owner: { name: 'LeanStacks' },
    plugins: [
      { name: 'one', source: './plugins/one' },
      { name: 'two', source: './plugins/two' },
    ],
  });
  for (const name of ['one', 'two']) {
    write(root, `plugins/${name}/.claude-plugin/plugin.json`, { name, version: '0.0.0' });
  }
  return root;
}

const skill = (name, description = 'Does a thing. Use when asked.') =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# Body\n`;

const messages = (root) => lintRepo(root).map((p) => `${p.file}: ${p.message}`);

afterEach(() => {
  while (tmpDirs.length > 0) rmSync(tmpDirs.pop(), { recursive: true, force: true });
});

describe('parseFrontmatter', () => {
  it('parses plain, quoted, and block-scalar values', () => {
    const { data } = parseFrontmatter(
      '---\nname: demo\ndescription: "Quoted: value"\nwhen: >\n  folded\n  text\nallowed-tools:\n  - Read\n  - Grep\n---\nbody',
    );
    expect(data).toMatchObject({ name: 'demo', description: 'Quoted: value', when: 'folded text' });
    expect(data['allowed-tools']).toBe('- Read - Grep');
  });

  it('returns null without a leading or closing delimiter', () => {
    expect(parseFrontmatter('# no frontmatter')).toBeNull();
    expect(parseFrontmatter('\n---\nname: x\n---\n')).toBeNull();
    expect(parseFrontmatter('---\nname: x\n')).toBeNull();
  });
});

describe('lintRepo', () => {
  it('passes the valid empty scaffold', () => {
    expect(lintRepo(makeRepo())).toEqual([]);
  });

  it('passes a scaffold with a valid skill and agent', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/demo-skill/SKILL.md', skill('demo-skill'));
    write(
      root,
      'plugins/one/agents/reviewer.md',
      '---\nname: reviewer\ndescription: Reviews code.\ntools: Read, Grep\n---\nBody',
    );
    write(root, 'plugins/one/skills/.gitkeep', '');
    expect(lintRepo(root)).toEqual([]);
  });

  it('reports a missing marketplace file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'lstk-lint-'));
    tmpDirs.push(root);
    expect(messages(root)).toEqual(['.claude-plugin/marketplace.json: file not found']);
  });

  it('reports invalid marketplace JSON', () => {
    const root = makeRepo();
    write(root, '.claude-plugin/marketplace.json', '{ not json');
    expect(messages(root)).toEqual([expect.stringContaining('marketplace.json: invalid JSON')]);
  });

  it('reports missing marketplace name, owner, and plugins', () => {
    const root = makeRepo();
    write(root, '.claude-plugin/marketplace.json', {});
    expect(messages(root)).toEqual([
      expect.stringContaining('"name" must be a non-empty string'),
      expect.stringContaining('"owner" must be an object'),
      expect.stringContaining('"plugins" must be an array'),
    ]);
  });

  it('reports a duplicate plugin name', () => {
    const root = makeRepo();
    write(root, '.claude-plugin/marketplace.json', {
      name: 'lstk',
      owner: { name: 'LeanStacks' },
      plugins: [
        { name: 'one', source: './plugins/one' },
        { name: 'one', source: './plugins/two' },
      ],
    });
    expect(messages(root)).toContainEqual(expect.stringContaining('duplicate plugin name "one"'));
  });

  it('reports a source outside the repository', () => {
    const root = makeRepo();
    write(root, '.claude-plugin/marketplace.json', {
      name: 'lstk',
      owner: { name: 'LeanStacks' },
      plugins: [{ name: 'one', source: '../elsewhere' }],
    });
    expect(messages(root)).toEqual([expect.stringContaining('must be inside the repository')]);
  });

  it('reports a source directory that does not exist', () => {
    const root = makeRepo();
    write(root, '.claude-plugin/marketplace.json', {
      name: 'lstk',
      owner: { name: 'LeanStacks' },
      plugins: [{ name: 'ghost', source: './plugins/ghost' }],
    });
    expect(messages(root)).toEqual([expect.stringContaining('does not exist')]);
  });

  it('reports a missing plugin.json', () => {
    const root = makeRepo();
    rmSync(path.join(root, 'plugins/two/.claude-plugin/plugin.json'));
    expect(messages(root)).toEqual(['plugins/two/.claude-plugin/plugin.json: file not found']);
  });

  it('reports invalid plugin.json', () => {
    const root = makeRepo();
    write(root, 'plugins/two/.claude-plugin/plugin.json', '{');
    expect(messages(root)).toEqual([expect.stringContaining('plugin.json: invalid JSON')]);
  });

  it('reports a plugin.json name that differs from the marketplace entry', () => {
    const root = makeRepo();
    write(root, 'plugins/two/.claude-plugin/plugin.json', { name: 'other' });
    expect(messages(root)).toEqual([expect.stringContaining('must match marketplace entry "two"')]);
  });

  it('reports an invalid semver version', () => {
    const root = makeRepo();
    write(root, 'plugins/one/.claude-plugin/plugin.json', { name: 'one', version: '1.0' });
    expect(messages(root)).toEqual([expect.stringContaining('not valid semver')]);
  });

  it('accepts a prerelease semver version', () => {
    const root = makeRepo();
    write(root, 'plugins/one/.claude-plugin/plugin.json', { name: 'one', version: '1.2.3-rc.1+build.5' });
    expect(lintRepo(root)).toEqual([]);
  });

  it('reports a component directory nested in .claude-plugin', () => {
    const root = makeRepo();
    write(root, 'plugins/one/.claude-plugin/skills/.gitkeep', '');
    expect(messages(root)).toEqual([expect.stringContaining('must sit at the plugin root')]);
  });

  it('reports a skill whose name differs from its directory', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/dir-name/SKILL.md', skill('other-name'));
    expect(messages(root)).toEqual([expect.stringContaining('must equal the directory name "dir-name"')]);
  });

  it('reports an empty skill description', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/demo/SKILL.md', '---\nname: demo\ndescription:\n---\n');
    expect(messages(root)).toEqual([expect.stringContaining('"description" must be non-empty')]);
  });

  it('reports a description over the 1024-character cap and accepts one at the cap', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/long/SKILL.md', skill('long', 'x'.repeat(1025)));
    write(root, 'plugins/one/skills/edge/SKILL.md', skill('edge', 'x'.repeat(1024)));
    const found = messages(root);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/long\/SKILL\.md.*1025 characters/);
  });

  it('accepts disable-model-invocation true and false, and rejects other values', () => {
    const root = makeRepo();
    const withFlag = (name, value) => skill(name).replace('\n---\n', `\ndisable-model-invocation: ${value}\n---\n`);
    write(root, 'plugins/one/skills/on/SKILL.md', withFlag('on', 'true'));
    write(root, 'plugins/one/skills/off/SKILL.md', withFlag('off', 'false'));
    write(root, 'plugins/one/skills/bad/SKILL.md', withFlag('bad', 'yes'));
    const found = messages(root);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/bad\/SKILL\.md.*disable-model-invocation.*"yes"/);
  });

  describe('skill file references', () => {
    const withBody = (name, body) => skill(name) + body;

    it('passes when referenced files exist, including via ${CLAUDE_SKILL_DIR}', () => {
      const root = makeRepo();
      write(
        root,
        'plugins/one/skills/ok/SKILL.md',
        withBody(
          'ok',
          'See `references/a.md`, [b](references/b.md), and node "${CLAUDE_SKILL_DIR}/scripts/run.mjs".\n',
        ),
      );
      write(root, 'plugins/one/skills/ok/references/a.md', 'a');
      write(root, 'plugins/one/skills/ok/references/b.md', 'b');
      write(root, 'plugins/one/skills/ok/scripts/run.mjs', '');
      expect(messages(root)).toEqual([]);
    });

    it('reports a missing reference with file and line', () => {
      const root = makeRepo();
      write(root, 'plugins/one/skills/gone/SKILL.md', withBody('gone', 'Read `references/missing.md`.\n'));
      const found = messages(root);
      expect(found).toHaveLength(1);
      expect(found[0]).toMatch(/gone\/SKILL\.md:\d+: references "references\/missing\.md"/);
    });

    it('reports a missing script and template, ignoring trailing punctuation', () => {
      const root = makeRepo();
      write(
        root,
        'plugins/one/skills/both/SKILL.md',
        withBody('both', 'Run scripts/x.mjs. Fill templates/t.md, then stop.\n'),
      );
      expect(messages(root)).toHaveLength(2);
    });

    it('ignores globs, placeholders, bare directories, and paths with a different prefix', () => {
      const root = makeRepo();
      write(
        root,
        'plugins/one/skills/loose/SKILL.md',
        withBody(
          'loose',
          "Look in 'scripts/*', scripts/setup*, references/<name>.md, the scripts/ folder, or docs/references/x.md.\n",
        ),
      );
      expect(messages(root)).toEqual([]);
    });
  });

  it('reports a skill with no frontmatter block', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/demo/SKILL.md', '# Just a heading\n');
    expect(messages(root)).toEqual([expect.stringContaining('missing or unterminated frontmatter')]);
  });

  it('reports a skill name with invalid characters', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/Bad_Name/SKILL.md', skill('Bad_Name'));
    expect(messages(root)).toEqual([expect.stringContaining('lowercase letters, digits, and single hyphens')]);
  });

  it('reports a skill name that is too long', () => {
    const root = makeRepo();
    const name = 'a'.repeat(65);
    write(root, `plugins/one/skills/${name}/SKILL.md`, skill(name));
    expect(messages(root)).toEqual([expect.stringContaining('at most 64 characters')]);
  });

  it('reports a skill directory without SKILL.md', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/empty/notes.md', 'x');
    expect(messages(root)).toEqual([expect.stringContaining('has no SKILL.md')]);
  });

  it('reports an agent missing name and description', () => {
    const root = makeRepo();
    write(root, 'plugins/one/agents/bad.md', '---\ntools: Read\n---\nBody');
    expect(messages(root)).toEqual([
      expect.stringContaining('"name" must be non-empty'),
      expect.stringContaining('"description" must be non-empty'),
    ]);
  });

  it('accepts an agent whose tools are a comma list or a YAML list', () => {
    const root = makeRepo();
    write(root, 'plugins/one/agents/a.md', '---\nname: a\ndescription: d\ntools: Read, Grep, WebFetch\n---\n');
    write(root, 'plugins/one/agents/b.md', '---\nname: b\ndescription: d\ntools:\n  - Read\n  - WebSearch\n---\n');
    expect(lintRepo(root)).toEqual([]);
  });

  it('reports an agent with no tools allowlist', () => {
    const root = makeRepo();
    write(root, 'plugins/one/agents/open.md', '---\nname: open\ndescription: d\n---\n');
    expect(messages(root)).toEqual([expect.stringContaining('"tools" must declare a non-empty allowlist')]);
  });

  it('reports write-capable tools in an agent allowlist', () => {
    const root = makeRepo();
    write(
      root,
      'plugins/one/agents/rw.md',
      '---\nname: rw\ndescription: d\ntools: Read, Bash(git *), Write, Edit, NotebookEdit\n---\n',
    );
    expect(messages(root)).toEqual([
      expect.stringContaining('write-capable tool "Bash"'),
      expect.stringContaining('write-capable tool "Write"'),
      expect.stringContaining('write-capable tool "Edit"'),
      expect.stringContaining('write-capable tool "NotebookEdit"'),
    ]);
  });

  it('reports an agent with no frontmatter', () => {
    const root = makeRepo();
    write(root, 'plugins/one/agents/bad.md', 'Body only');
    expect(messages(root)).toEqual([expect.stringContaining('missing or unterminated frontmatter')]);
  });

  it('reports a ../ reference with file and line', () => {
    const root = makeRepo();
    write(root, 'plugins/one/skills/demo/SKILL.md', `${skill('demo')}\nSee ../../shared/notes.md\n`);
    expect(messages(root)).toEqual([
      expect.stringMatching(/^plugins\/one\/skills\/demo\/SKILL\.md:\d+: contains "\.\.\/"/),
    ]);
  });

  it('does not flag ../ outside plugin directories', () => {
    const root = makeRepo();
    write(root, 'docs/notes.md', 'See ../elsewhere');
    expect(lintRepo(root)).toEqual([]);
  });

  describe('hooks', () => {
    const hooksJson = (command, args) => ({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command, args }] }] },
    });

    it('passes a hooks.json whose referenced scripts exist', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/run.mjs', '');
      write(root, 'plugins/one/hooks/hooks.json', hooksJson('node', ['${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs']));
      expect(lintRepo(root)).toEqual([]);
    });

    it('passes a shell-form command that references an existing script', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/run.mjs', '');
      write(root, 'plugins/one/hooks/hooks.json', hooksJson('node "${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs"'));
      expect(lintRepo(root)).toEqual([]);
    });

    it('reports invalid JSON', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/hooks.json', '{nope');
      expect(messages(root)).toEqual([expect.stringContaining('hooks/hooks.json: invalid JSON')]);
    });

    it('reports a missing top-level hooks object', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/hooks.json', { PreToolUse: [] });
      expect(messages(root)).toEqual([expect.stringContaining('top-level "hooks" object')]);
    });

    it('reports an event that is not an array and a group with no handlers', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/hooks.json', { hooks: { Stop: {}, PreToolUse: [{ matcher: 'Bash' }] } });
      expect(messages(root)).toEqual([
        expect.stringContaining('"hooks.Stop" must be an array'),
        expect.stringContaining('"hooks.PreToolUse" has a matcher group with no "hooks" array'),
      ]);
    });

    it('reports a referenced script that does not exist', () => {
      const root = makeRepo();
      write(root, 'plugins/one/hooks/hooks.json', hooksJson('node', ['${CLAUDE_PLUGIN_ROOT}/hooks/missing.mjs']));
      expect(messages(root)).toEqual([expect.stringContaining('references "hooks/missing.mjs", which does not exist')]);
    });

    it('ignores a plugin with no hooks directory', () => {
      expect(lintRepo(makeRepo())).toEqual([]);
    });
  });

  it('reports a shell script in a plugin', () => {
    const root = makeRepo();
    write(root, 'plugins/one/hooks/old.sh', '#!/bin/bash\n');
    expect(messages(root)).toEqual([
      expect.stringContaining('plugins/one/hooks/old.sh: shell scripts are not allowed'),
    ]);
  });

  it('does not flag shell scripts outside plugin directories', () => {
    const root = makeRepo();
    write(root, 'scripts/dev.sh', '#!/bin/bash\n');
    expect(lintRepo(root)).toEqual([]);
  });

  it('passes on the real repository', () => {
    expect(lintRepo(REAL_ROOT)).toEqual([]);
  });
});
