// Path normalization and gitignore-like glob matching. Node built-ins only.
import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';

const MAX_LINK_DEPTH = 20;

/** Normalize backslash separators so patterns match paths written in the Windows style. */
export const toPosix = (p) => p.replaceAll('\\', '/');

/**
 * Real path of the deepest existing ancestor, with the not-yet-existing remainder appended.
 * Follows dangling symlinks so that creating a file through one resolves to its target.
 */
export function realpathDeepest(target, depth = 0) {
  const rest = [];
  let cur = target;
  for (;;) {
    try {
      return path.join(realpathSync(cur), ...rest.reverse());
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return target;
      if (depth < MAX_LINK_DEPTH) {
        try {
          if (lstatSync(cur).isSymbolicLink()) {
            const resolved = path.resolve(path.dirname(cur), readlinkSync(cur));
            return realpathDeepest(path.join(resolved, ...rest.reverse()), depth + 1);
          }
        } catch {
          // Not a symlink, or not readable: fall through and walk up.
        }
      }
      const parent = path.dirname(cur);
      if (parent === cur) return target;
      rest.push(path.basename(cur));
      cur = parent;
    }
  }
}

/**
 * Resolve a tool-call file path against cwd.
 * `lexical` has `..` and `.` resolved. `real` also resolves symlinks.
 */
export function resolveTarget(filePath, cwd) {
  const lexical = path.resolve(cwd, toPosix(filePath));
  return { lexical, real: realpathDeepest(lexical) };
}

/** Path relative to root in posix form, or the absolute path if it lies outside root. */
export function relativeTo(root, abs) {
  const rel = path.relative(root, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return toPosix(abs);
  }
  return toPosix(rel);
}

/** Compile a glob segment or path into a RegExp source. `*` and `?` stay inside a segment. */
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * Match a gitignore-like pattern against a posix path relative to the project root.
 *  - No slash: matches any path segment, so it also covers everything under a matching directory.
 *  - Trailing slash: matches a directory anywhere in the path, never the final segment.
 *  - A slash elsewhere anchors the pattern to the root (a leading slash is optional).
 *  - `*` and `?` do not cross a slash. `**` does. Negation (`!`) is not supported.
 */
export function matchPattern(pattern, relPath) {
  const dirOnly = pattern.endsWith('/');
  let body = dirOnly ? pattern.slice(0, -1) : pattern;
  if (!body) return false;

  const segments = relPath.split('/').filter(Boolean);
  const limit = dirOnly ? segments.length - 1 : segments.length;

  if (!body.includes('/')) {
    const re = globToRegExp(body);
    return segments.slice(0, Math.max(limit, 0)).some((s) => re.test(s));
  }

  body = body.replace(/^\//, '');
  const re = globToRegExp(body);
  for (let n = 1; n <= limit; n++) {
    if (re.test(segments.slice(0, n).join('/'))) return true;
  }
  return false;
}
