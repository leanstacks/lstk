import { describe, expect, it } from 'vitest';
import { parseShell } from '../../../plugins/lstk-guardrails/hooks/lib/tokenize.mjs';

describe('parseShell', () => {
  it('splits on separators', () => {
    expect(parseShell('a b; c | d && e || f & g\nh').segments).toEqual([
      ['a', 'b'],
      ['c'],
      ['d'],
      ['e'],
      ['f'],
      ['g'],
      ['h'],
    ]);
  });

  it('keeps quoted separators and spaces inside one word', () => {
    expect(parseShell(`echo "a; b" 'c && d'`).segments).toEqual([['echo', 'a; b', 'c && d']]);
  });

  it('keeps an empty quoted string as a word', () => {
    expect(parseShell(`echo ""`).segments).toEqual([['echo', '']]);
  });

  it('handles backslash escapes and line continuations', () => {
    expect(parseShell('echo a\\ b').segments).toEqual([['echo', 'a b']]);
    expect(parseShell('echo a \\\n b').segments).toEqual([['echo', 'a', 'b']]);
  });

  it('collects command substitutions, including inside double quotes', () => {
    expect(parseShell('echo $(cdk deploy) "$(a (b))" `c d`').nested).toEqual(['cdk deploy', 'a (b)', 'c d']);
  });

  it('does not expand inside single quotes', () => {
    expect(parseShell("echo '$(cdk deploy)'").nested).toEqual([]);
  });

  it('tolerates unterminated quotes and substitutions', () => {
    expect(() => parseShell('echo "abc')).not.toThrow();
    expect(() => parseShell('echo $(abc')).not.toThrow();
    expect(() => parseShell('echo `abc')).not.toThrow();
    expect(parseShell('').segments).toEqual([]);
  });
});
