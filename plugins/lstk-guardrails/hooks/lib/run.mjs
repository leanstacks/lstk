// Hook entry point wrapper. Every path exits 0.
//
// A matched rule is a decision, not an error. Any unexpected failure (bad input, a bug in the
// handler) prints a warning on stderr and fails open, per PLAN §5. Exit 2 is never used, and
// the permission rules in the settings snippets remain the backstop.
import { toOutput, warn } from './decision.mjs';
import { readInput } from './stdin.mjs';

const defaultIo = {
  readInput: () => readInput(),
  write: (text) => process.stdout.write(text),
  warn,
};

/**
 * @param {string} name hook name used in warnings
 * @param {(input: object) => object | Promise<object>} handler returns deny(), ask(), or allow()
 * @param {object} [io] injectable for tests
 */
export async function runHook(name, handler, io = defaultIo) {
  try {
    const input = await io.readInput();
    const output = toOutput(await handler(input));
    if (output) io.write(`${JSON.stringify(output)}\n`);
  } catch (err) {
    io.warn(`lstk-guardrails: ${name} internal error (${err?.message ?? err}); failing open`);
  }
}
