import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { allow, ask, deny } from '../../../plugins/lstk-guardrails/hooks/lib/decision.mjs';
import { runHook } from '../../../plugins/lstk-guardrails/hooks/lib/run.mjs';
import { InputError } from '../../../plugins/lstk-guardrails/hooks/lib/stdin.mjs';

const RUN_URL = new URL('../../../plugins/lstk-guardrails/hooks/lib/run.mjs', import.meta.url).href;
const DECISION_URL = new URL('../../../plugins/lstk-guardrails/hooks/lib/decision.mjs', import.meta.url).href;

function fakeIo(input) {
  const out = { stdout: '', stderr: '' };
  return {
    out,
    io: {
      readInput: async () => {
        if (input instanceof Error) throw input;
        return input;
      },
      write: (t) => (out.stdout += t),
      warn: (m) => (out.stderr += `${m}\n`),
    },
  };
}

describe('runHook (in process)', () => {
  it('prints the decision JSON for deny and ask', async () => {
    const { io, out } = fakeIo({ x: 1 });
    await runHook('t', () => deny('no'), io);
    expect(JSON.parse(out.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.stderr).toBe('');

    const second = fakeIo({});
    await runHook('t', () => ask('maybe'), second.io);
    expect(JSON.parse(second.out.stdout).hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('prints nothing for allow', async () => {
    const { io, out } = fakeIo({});
    await runHook('t', () => allow(), io);
    expect(out).toEqual({ stdout: '', stderr: '' });
  });

  it('passes parsed input to the handler and awaits async handlers', async () => {
    const { io, out } = fakeIo({ tool_input: { command: 'x' } });
    await runHook('t', async (i) => deny(i.tool_input.command), io);
    expect(JSON.parse(out.stdout).hookSpecificOutput.permissionDecisionReason).toBe('x');
  });

  it('fails open with a stderr warning when the handler throws', async () => {
    const { io, out } = fakeIo({});
    await runHook(
      'block-cdk-mutate',
      () => {
        throw new Error('boom');
      },
      io,
    );
    expect(out.stdout).toBe('');
    expect(out.stderr).toBe('lstk-guardrails: block-cdk-mutate internal error (boom); failing open\n');
  });

  it('fails open on malformed input', async () => {
    const { io, out } = fakeIo(new InputError('malformed hook input JSON: x'));
    await runHook('t', () => deny('never reached'), io);
    expect(out.stdout).toBe('');
    expect(out.stderr).toContain('failing open');
  });

  it('fails open when the handler returns an unknown decision', async () => {
    const { io, out } = fakeIo({});
    await runHook('t', () => ({ decision: 'bogus' }), io);
    expect(out.stdout).toBe('');
    expect(out.stderr).toContain('failing open');
  });
});

describe('runHook (spawned process contract)', () => {
  const run = (body, stdin) =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { runHook } from '${RUN_URL}'; import { deny } from '${DECISION_URL}'; ${body}`,
      ],
      { input: stdin, encoding: 'utf8' },
    );

  it('exits 0 with only the JSON object on stdout for deny', () => {
    const r = run(`await runHook('t', () => deny('stop'), undefined);`, '{}');
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason).toBe('stop');
    expect(r.stderr).toBe('');
  });

  it('exits 0 with a stderr warning when the handler throws', () => {
    const r = run(`await runHook('t', () => { throw new Error('boom'); });`, '{}');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('lstk-guardrails: t internal error (boom); failing open');
  });

  it('exits 0 with a stderr warning on malformed stdin', () => {
    const r = run(`await runHook('t', () => deny('x'));`, '{not json');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('failing open');
  });

  it('treats empty stdin as an empty input object', () => {
    const r = run(`await runHook('t', (i) => deny(JSON.stringify(i)));`, '');
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason).toBe('{}');
  });
});
