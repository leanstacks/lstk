// A small shell-aware lexer. Node built-ins only.
//
// parseShell(src) splits a command line into simple-command segments (arrays of words) and
// collects the bodies of command substitutions ($(...) and backticks) as separate strings for
// the caller to scan again. It respects single quotes, double quotes, and backslash escapes.
// It is not a full shell parser: it exists so the hook can find the command word of each
// simple command instead of regex-matching the raw string.

const SEPARATORS = new Set([';', '|', '&', '\n', '(', ')']);

/** Read a balanced $( ... ) body starting just after the opening "(". Returns [inner, nextIndex]. */
function readParenBody(src, start) {
  let depth = 1;
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      i = end === -1 ? src.length : end + 1;
      continue;
    }
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')' && --depth === 0) return [src.slice(start, i), i + 1];
    i++;
  }
  return [src.slice(start), src.length];
}

/** Read a backtick body starting just after the opening backtick. Returns [inner, nextIndex]. */
function readBacktickBody(src, start) {
  let i = start;
  let inner = '';
  while (i < src.length && src[i] !== '`') {
    if (src[i] === '\\' && i + 1 < src.length) {
      inner += src[i + 1];
      i += 2;
    } else {
      inner += src[i++];
    }
  }
  return [inner, i + 1];
}

/**
 * @param {string} src
 * @returns {{ segments: string[][], nested: string[] }}
 */
export function parseShell(src) {
  const segments = [];
  const nested = [];
  let words = [];
  let cur = '';
  let inWord = false;

  const endWord = () => {
    if (inWord) words.push(cur);
    cur = '';
    inWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length) segments.push(words);
    words = [];
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === '\\') {
      const next = src[i + 1];
      if (next === undefined) break;
      if (next !== '\n') {
        cur += next;
        inWord = true;
      }
      i += 2;
    } else if (c === "'") {
      const end = src.indexOf("'", i + 1);
      const stop = end === -1 ? src.length : end;
      cur += src.slice(i + 1, stop);
      inWord = true;
      i = stop + 1;
    } else if (c === '"') {
      inWord = true;
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          const next = src[i + 1];
          if (next !== '\n') cur += '"\\$`'.includes(next) ? next : `\\${next}`;
          i += 2;
        } else if (src[i] === '$' && src[i + 1] === '(') {
          const [inner, next] = readParenBody(src, i + 2);
          nested.push(inner);
          i = next;
        } else if (src[i] === '`') {
          const [inner, next] = readBacktickBody(src, i + 1);
          nested.push(inner);
          i = next;
        } else {
          cur += src[i++];
        }
      }
      i++;
    } else if (c === '$' && src[i + 1] === '(') {
      const [inner, next] = readParenBody(src, i + 2);
      nested.push(inner);
      inWord = true;
      i = next;
    } else if (c === '`') {
      const [inner, next] = readBacktickBody(src, i + 1);
      nested.push(inner);
      inWord = true;
      i = next;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      endWord();
      i++;
    } else if (SEPARATORS.has(c)) {
      endSegment();
      i++;
    } else {
      cur += c;
      inWord = true;
      i++;
    }
  }
  endSegment();
  return { segments, nested };
}
