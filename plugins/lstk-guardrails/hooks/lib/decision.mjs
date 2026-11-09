// PreToolUse decisions. Handlers return one of these; runHook emits it.
//
// deny and ask are printed as the documented hookSpecificOutput JSON on stdout with exit 0.
// allow prints nothing, so the normal permission flow applies. Never emit an explicit
// "allow" JSON: that would skip the user's own ask rules.

function reasonText(reason) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new TypeError('a deny or ask decision needs a non-empty reason');
  }
  return reason;
}

export const deny = (reason) => ({ decision: 'deny', reason: reasonText(reason) });
export const ask = (reason) => ({ decision: 'ask', reason: reasonText(reason) });
export const allow = () => ({ decision: 'allow' });

/** The stdout payload for a decision, or null when nothing should be printed. */
export function toOutput(result) {
  if (!result || result.decision === 'allow') return null;
  if (result.decision !== 'deny' && result.decision !== 'ask') {
    throw new TypeError(`unknown decision: ${String(result.decision)}`);
  }
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: result.decision,
      permissionDecisionReason: reasonText(result.reason),
    },
  };
}

/** Write a warning to stderr. Stdout stays reserved for the decision object. */
export function warn(message) {
  process.stderr.write(`${message}\n`);
}
