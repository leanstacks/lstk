import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../plugins/lstk-guardrails/hooks/block-cdk-mutate.mjs';
import { matrixRows, withRow } from './helpers.mjs';

const HOOK = new URL('../../plugins/lstk-guardrails/hooks/block-cdk-mutate.mjs', import.meta.url).pathname;
const rows = matrixRows('block-cdk-mutate');

describe('block-cdk-mutate evaluate() against hook-matrix.json', () => {
  it.each(rows.map((r) => [r.id, r]))('%s', (_id, row) => {
    withRow(row, (input) => {
      expect(evaluate(input).decision).toBe(row.target);
    });
  });
});

describe('block-cdk-mutate evaluate() extras', () => {
  const run = (command, cwd = '/') => evaluate({ tool_input: { command }, cwd }).decision;

  it('tolerates missing fields', () => {
    expect(evaluate({}).decision).toBe('allow');
    expect(evaluate({ tool_input: {} }).decision).toBe('allow');
    expect(evaluate(undefined).decision).toBe('allow');
  });

  it.each([
    'FOO=1 cdk deploy',
    'env AWS_PROFILE=x cdk deploy',
    'sudo -u bob cdk deploy',
    'time npx cdk destroy',
    'cdk --profile dev --require-approval never deploy',
    'cdk -c env=prod deploy',
    'cdk --context=a=b deploy',
    './node_modules/.bin/cdk deploy',
    'pnpm dlx aws-cdk deploy',
    'yarn cdk deploy',
    'npx -y -p aws-cdk cdk deploy',
    'npm exec --package=aws-cdk -- cdk deploy',
    'sh -c "echo hi; cdk deploy"',
    "bash -lc 'cdk destroy'",
    'bash -c "bash -c \\"cdk deploy\\""',
    'echo "$(cdk deploy)"',
    '(cd infra && cdk deploy)',
    '{ cdk deploy; }',
    'if true; then cdk deploy; fi',
    'cdk synth && \\\ncdk deploy',
    'cdk --unknown-flag value deploy',
  ])('denies %j', (command) => {
    expect(run(command)).toBe('deny');
  });

  it.each(['cdk synth deploy', 'echo cdk deploy', 'git commit -m x', 'cdkdeploy', 'cdk'])('allows %j', (command) => {
    expect(run(command)).toBe('allow');
  });

  it('deny wins over ask', () => {
    expect(run('cdk bootstrap; cdk watch')).toBe('deny');
  });

  it('stops on recursive package scripts', () => {
    const row = {
      input: { tool_input: { command: 'npm run a' }, cwd: '${TMP}' },
      setup: {
        files: { 'package.json': JSON.stringify({ scripts: { a: 'npm run b', b: 'npm run a' } }) },
      },
    };
    withRow(row, (input) => expect(evaluate(input).decision).toBe('allow'));
  });

  it('finds the nearest package.json from a subdirectory', () => {
    const row = {
      input: { tool_input: { command: 'npm run ship' }, cwd: '${TMP}/packages/app' },
      setup: {
        files: {
          'package.json': JSON.stringify({ scripts: { ship: 'cdk deploy' } }),
          'packages/app/readme.md': '',
        },
      },
    };
    withRow(row, (input) => expect(evaluate(input).decision).toBe('deny'));
  });

  it('survives an unparseable package.json', () => {
    const row = {
      input: { tool_input: { command: 'npm run build' }, cwd: '${TMP}' },
      setup: { files: { 'package.json': '{nope' } },
    };
    withRow(row, (input) => expect(evaluate(input).decision).toBe('allow'));
  });

  it('gives the deny message what, why, and instead', () => {
    const { reason } = evaluate({ tool_input: { command: 'cdk deploy' }, cwd: '/' });
    expect(reason).toContain('Blocked: `cdk deploy`');
    expect(reason).toContain('cdk synth');
    expect(reason).toContain('Do not retry');
  });
});

describe('block-cdk-mutate process contract', () => {
  const spawn = (command) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: '/' }),
      encoding: 'utf8',
    });

  it('denies through hookSpecificOutput JSON on stdout with exit 0', () => {
    const r = spawn('cdk deploy');
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    expect(out.hookEventName).toBe('PreToolUse');
    expect(out.permissionDecision).toBe('deny');
    expect(out.permissionDecisionReason).toContain('cdk synth');
  });

  it('asks for cdk bootstrap', () => {
    const r = spawn('cdk bootstrap');
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('prints nothing for an allowed command', () => {
    const r = spawn('cdk synth');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  it('fails open on malformed input', () => {
    const r = spawnSync(process.execPath, [HOOK], { input: '{bad', encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('block-cdk-mutate internal error');
  });
});
