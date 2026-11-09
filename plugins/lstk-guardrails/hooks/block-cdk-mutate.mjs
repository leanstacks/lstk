#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Blocks autonomous CDK deploy, destroy, and watch.
//
//   deny : cdk deploy | destroy | watch, however it is invoked (npx, aws-cdk, cdk@2.x, flags before
//          the subcommand, bash -c, $(...), backticks, chained commands), plus package scripts and
//          make targets that look like deploy or destroy or whose package.json body runs one.
//   ask  : cdk bootstrap
//   allow: everything else
//
// This is a text-level check. It cannot see inside scripts that are not in the nearest package.json,
// Makefile recipes, env-var-indirected binaries, or eval'd strings. Pair it with a read-only AWS
// identity for the real guarantee. Internal errors fail open (see lib/run.mjs).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { allow, ask, deny } from './lib/decision.mjs';
import { runHook } from './lib/run.mjs';
import { parseShell } from './lib/tokenize.mjs';

const MAX_DEPTH = 6;
const CDK_EXE = /^(aws-)?cdk(@\S+)?$/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SCRIPT_NAME = /^([a-z0-9]+[:_-])*(deploy|destroy)([:_-].*)?$/i;
const DENIED = new Set(['deploy', 'destroy', 'watch']);
const KNOWN_OTHER = new Set([
  'list',
  'ls',
  'synthesize',
  'synth',
  'diff',
  'metadata',
  'init',
  'context',
  'docs',
  'doc',
  'doctor',
  'notices',
  'migrate',
  'import',
  'acknowledge',
  'ack',
  'flags',
  'gc',
  'refactor',
  'rollback',
]);
const CDK_VALUE_FLAGS = new Set([
  '-a',
  '--app',
  '-c',
  '--context',
  '--profile',
  '-o',
  '--output',
  '-r',
  '--role-arn',
  '--plugin',
]);
// Words that run another command. Value is the set of that word's options that take a value.
const PREFIXES = new Map([
  ['env', new Set(['-u', '--unset', '-C', '--chdir', '-S'])],
  ['time', new Set()],
  ['command', new Set()],
  ['nohup', new Set()],
  ['exec', new Set()],
  ['sudo', new Set(['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T', '-U'])],
  // Shell keywords that can precede a command word.
  ['{', new Set()],
  ['!', new Set()],
  ['if', new Set()],
  ['then', new Set()],
  ['else', new Set()],
  ['elif', new Set()],
  ['while', new Set()],
  ['until', new Set()],
  ['do', new Set()],
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const PKG_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const LAUNCHERS = new Set(['npx', 'bunx', 'pnpx', ...PKG_MANAGERS]);
const LAUNCHER_WORDS = new Set(['exec', 'x', 'dlx', 'run', 'run-script']);

const DENY_MESSAGE = (what) =>
  `Blocked: ${what}. Autonomous CDK deploy, destroy, and watch are disabled by lstk-guardrails. ` +
  'Do not retry or wrap it in a script. Run `cdk synth` or `cdk diff` to validate, and ask the user ' +
  'to run the deployment, or leave it to a pipeline.';
const ASK_MESSAGE =
  '`cdk bootstrap` changes shared resources in the target AWS account and region. Confirm before running.';

/** Find and parse the nearest package.json scripts, walking up from cwd. */
function findScripts(cwd) {
  let dir = path.resolve(cwd);
  for (;;) {
    const file = path.join(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(file, 'utf8'));
      const scripts = pkg && typeof pkg.scripts === 'object' && pkg.scripts ? pkg.scripts : {};
      return { file, scripts };
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return { file, scripts: {} };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function checkCdk(args, findings) {
  for (let i = 0; i < args.length; i++) {
    const tok = args[i];
    if (CDK_EXE.test(tok) || tok === '--') continue;
    if (tok.startsWith('-')) {
      if (CDK_VALUE_FLAGS.has(tok)) i++;
      continue;
    }
    if (DENIED.has(tok)) {
      findings.push({ level: 'deny', what: `\`cdk ${tok}\`` });
      return;
    }
    if (tok === 'bootstrap') {
      findings.push({ level: 'ask' });
      return;
    }
    if (KNOWN_OTHER.has(tok)) return;
  }
}

function checkLauncher(head, args, ctx, depth, findings) {
  const positional = args.filter((t) => !t.startsWith('-') && !ASSIGNMENT.test(t));

  const first = positional.find((t) => !LAUNCHER_WORDS.has(t));
  if (first && CDK_EXE.test(first)) checkCdk(args.slice(args.indexOf(first) + 1), findings);

  if (!PKG_MANAGERS.has(head)) return;
  for (const tok of positional) {
    if (SCRIPT_NAME.test(tok)) {
      findings.push({
        level: 'deny',
        what: `\`${tok}\` looks like a deploy or destroy package script`,
      });
      continue;
    }
    const body = ctx.pkg?.scripts[tok];
    const key = `${ctx.pkg?.file}:${tok}`;
    if (typeof body !== 'string' || ctx.visited.has(key)) continue;
    ctx.visited.add(key);
    const inner = [];
    scan(body, ctx, depth + 1, inner);
    if (inner.some((f) => f.level === 'deny')) {
      findings.push({
        level: 'deny',
        what: `package script \`${tok}\` runs a CDK deploy, destroy, or watch`,
      });
    } else if (inner.length) {
      findings.push({ level: 'ask' });
    }
  }
}

function inspect(tokens, ctx, depth, findings) {
  let t = tokens;
  for (;;) {
    if (t.length && ASSIGNMENT.test(t[0])) {
      t = t.slice(1);
      continue;
    }
    const valueFlags = t.length ? PREFIXES.get(path.basename(t[0])) : undefined;
    if (!valueFlags) break;
    t = t.slice(1);
    while (t.length && t[0].startsWith('-')) {
      t = t.slice(valueFlags.has(t[0]) ? 2 : 1);
    }
  }
  if (!t.length) return;

  const head = path.basename(t[0]);
  const args = t.slice(1);

  if (CDK_EXE.test(head)) {
    checkCdk(args, findings);
  } else if (SHELLS.has(head)) {
    const flag = args.findIndex((a) => /^-[A-Za-z]*c[A-Za-z]*$/.test(a));
    const body = flag === -1 ? undefined : args.slice(flag + 1).find((a) => !a.startsWith('-'));
    if (body !== undefined) scan(body, ctx, depth + 1, findings);
  } else if (LAUNCHERS.has(head)) {
    checkLauncher(head, args, ctx, depth, findings);
  } else if (head === 'make') {
    for (const tok of args) {
      if (tok.startsWith('-') || ASSIGNMENT.test(tok)) continue;
      if (SCRIPT_NAME.test(tok)) {
        findings.push({
          level: 'deny',
          what: `\`${tok}\` looks like a deploy or destroy make target`,
        });
      }
    }
  }
}

function scan(command, ctx, depth, findings) {
  if (depth > MAX_DEPTH) return;
  const { segments, nested } = parseShell(command);
  for (const inner of nested) scan(inner, ctx, depth + 1, findings);
  for (const seg of segments) inspect(seg, ctx, depth, findings);
}

/** Pure decision function. Returns { decision, reason? }. */
export function evaluate(input) {
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || command.trim() === '') return allow();

  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const ctx = { pkg: findScripts(cwd), visited: new Set() };
  const findings = [];
  scan(command, ctx, 0, findings);

  const denied = findings.find((f) => f.level === 'deny');
  if (denied) return deny(DENY_MESSAGE(denied.what));
  if (findings.length) return ask(ASK_MESSAGE);
  return allow();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runHook('block-cdk-mutate', evaluate);
}
