import { describe, expect, it } from 'vitest';
import { allow, ask, deny, toOutput } from '../../../plugins/lstk-guardrails/hooks/lib/decision.mjs';

describe('decision', () => {
  it('builds the documented PreToolUse JSON for deny and ask', () => {
    expect(toOutput(deny('why'))).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'why',
      },
    });
    expect(toOutput(ask('confirm')).hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('prints nothing for allow, so the normal permission flow applies', () => {
    expect(toOutput(allow())).toBeNull();
    expect(toOutput(undefined)).toBeNull();
  });

  it('requires a reason for deny and ask', () => {
    expect(() => deny('')).toThrow(TypeError);
    expect(() => ask()).toThrow(TypeError);
  });

  it('rejects unknown decisions', () => {
    expect(() => toOutput({ decision: 'defer' })).toThrow(TypeError);
  });
});
