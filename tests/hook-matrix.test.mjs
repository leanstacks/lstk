import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rows = JSON.parse(readFileSync(new URL('./fixtures/hook-matrix.json', import.meta.url), 'utf8'));

const DECISIONS = ['allow', 'ask', 'deny'];
const HOOKS = ['block-cdk-mutate', 'protect-files'];
const GROUPS = [
  'cdk-deny',
  'cdk-deny-wrapper',
  'cdk-ask',
  'cdk-allow',
  'cdk-divergence',
  'protect-block',
  'protect-allow',
  'divergence',
];

const commands = (group) => rows.filter((r) => r.group === group).map((r) => r.input.tool_input.command);
const paths = (group) => rows.filter((r) => r.group === group).map((r) => r.input.tool_input.file_path);

describe('hook-matrix.json shape', () => {
  it('has unique ids', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(rows.map((r) => [r.id, r]))('%s is well formed', (_id, row) => {
    expect(HOOKS).toContain(row.hook);
    expect(GROUPS).toContain(row.group);
    expect(DECISIONS).toContain(row.legacy);
    expect(DECISIONS).toContain(row.target);
    expect(row.input).toBeTypeOf('object');
    if (row.hook === 'block-cdk-mutate') {
      expect(row.input.tool_input.command).toBeTypeOf('string');
    } else {
      expect(row.input.tool_input.file_path).toBeTypeOf('string');
    }
  });

  it('requires a reason on every legacy/target divergence, and only there', () => {
    for (const row of rows) {
      if (row.legacy !== row.target) {
        expect(row.reason, row.id).toBeTypeOf('string');
        expect(row.reason.length, row.id).toBeGreaterThan(0);
      } else {
        expect(row.reason, row.id).toBeUndefined();
      }
    }
  });

  it('keeps setup recipes inside the temp directory', () => {
    for (const row of rows.filter((r) => r.setup)) {
      const entries = [...Object.keys(row.setup.files ?? {}), ...Object.keys(row.setup.symlinks ?? {})];
      for (const p of entries) {
        expect(p.startsWith('/'), row.id).toBe(false);
        expect(p.split('/').includes('..'), row.id).toBe(false);
      }
    }
  });

  it('covers every group', () => {
    for (const group of GROUPS) {
      expect(
        rows.some((r) => r.group === group),
        group,
      ).toBe(true);
    }
  });

  it('covers the required block-cdk-mutate cases', () => {
    const denied = commands('cdk-deny');
    for (const c of [
      'cdk deploy',
      'cdk destroy',
      'cdk watch',
      'npx cdk deploy',
      'npx aws-cdk deploy',
      'npm exec cdk deploy',
      'npm run cdk -- deploy',
      'cdk@2.150.0 deploy',
      'cdk -a x deploy',
      'cdk deploy --all',
      'a && cdk deploy',
      'a; cdk destroy',
      'a | cdk deploy',
      'bash -c "cdk deploy"',
      'echo $(cdk deploy)',
      'echo `cdk deploy`',
    ]) {
      expect(denied, c).toContain(c);
    }
    expect(denied.some((c) => c.includes('\n'))).toBe(true);
    expect(commands('cdk-deny-wrapper')).toEqual(
      expect.arrayContaining([
        'npm run deploy',
        'pnpm cdk:deploy',
        'yarn deploy:prod',
        'make deploy',
        'make infra-destroy',
      ]),
    );
    expect(rows.some((r) => r.group === 'cdk-deny-wrapper' && r.setup?.files?.['package.json'])).toBe(true);
    expect(commands('cdk-ask')).toEqual(
      expect.arrayContaining(['cdk bootstrap', 'npx cdk bootstrap aws://1/us-east-1']),
    );
    expect(commands('cdk-allow')).toEqual(
      expect.arrayContaining([
        'cdk synth',
        'cdk diff',
        'cdk ls',
        'cdk doctor',
        'npx cdk synth',
        'git status',
        'echo deploy',
        'ls cdk.out',
        'cdk-nag deploy-check',
        'npm test',
        'npm run build',
        '',
      ]),
    );
  });

  it('covers the required protect-files cases', () => {
    expect(paths('protect-block')).toEqual(
      expect.arrayContaining([
        '.env',
        'apps/api/.env',
        '.env.local',
        'package-lock.json',
        'sub/package-lock.json',
        '.git/config',
        '.git/hooks/pre-commit',
        'src/../.env',
        '../x/.env',
      ]),
    );
    expect(paths('protect-allow')).toEqual(expect.arrayContaining(['src/index.ts', 'README.md', 'package.json']));
    expect(paths('divergence')).toEqual(expect.arrayContaining(['src/.environment.ts', '.env.example']));
    expect(rows.some((r) => r.group === 'divergence' && r.setup?.symlinks)).toBe(true);
  });

  it('has no row that is group-inconsistent with its target', () => {
    const expected = {
      'cdk-deny': 'deny',
      'cdk-deny-wrapper': 'deny',
      'cdk-ask': 'ask',
      'cdk-allow': 'allow',
      'protect-block': 'deny',
      'protect-allow': 'allow',
    };
    for (const row of rows) {
      if (expected[row.group]) expect(row.target, row.id).toBe(expected[row.group]);
    }
  });
});
