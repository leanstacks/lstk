import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { InputError, parseInput, readInput } from '../../../plugins/lstk-guardrails/hooks/lib/stdin.mjs';

describe('parseInput', () => {
  it('returns {} for empty or whitespace input', () => {
    expect(parseInput('')).toEqual({});
    expect(parseInput('  \n')).toEqual({});
    expect(parseInput(undefined)).toEqual({});
  });

  it('returns {} for JSON null', () => {
    expect(parseInput('null')).toEqual({});
  });

  it('parses a tool call and tolerates missing fields', () => {
    expect(parseInput('{"tool_name":"Bash"}')).toEqual({ tool_name: 'Bash' });
    expect(parseInput('{}').tool_input).toBeUndefined();
  });

  it('throws InputError on malformed JSON', () => {
    expect(() => parseInput('{nope')).toThrow(InputError);
  });

  it('throws InputError on non-object JSON', () => {
    expect(() => parseInput('[1]')).toThrow(InputError);
    expect(() => parseInput('"x"')).toThrow(InputError);
    expect(() => parseInput('42')).toThrow(InputError);
  });
});

describe('readInput', () => {
  it('reads a multi-chunk stream', async () => {
    const stream = Readable.from(['{"cwd":', '"/tmp"}']);
    expect(await readInput(stream)).toEqual({ cwd: '/tmp' });
  });

  it('returns {} for an empty stream', async () => {
    expect(await readInput(Readable.from([]))).toEqual({});
  });
});
