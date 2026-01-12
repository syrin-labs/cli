/**
 * Tests for E500: Side Effect Detected rule.
 */

import { describe, it, expect } from 'vitest';
import { E500SideEffectDetected } from './e500-side-effect-detected';
import type { BehavioralContext } from './e500-side-effect-detected';

describe('E500: Side Effect Detected', () => {
  it('should have correct rule metadata', () => {
    expect(E500SideEffectDetected.id).toBe('E500');
    expect(E500SideEffectDetected.severity).toBe('error');
    expect(E500SideEffectDetected.ruleName).toBe('Side Effect Detected');
  });

  it('should detect side effects', () => {
    const context: BehavioralContext = {
      toolName: 'test_tool',
      sideEffects: [
        { operation: 'write', path: '/project/config.json' },
        { operation: 'delete', path: '/project/data.txt' },
      ],
    };

    const diagnostics =
      E500SideEffectDetected.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E500');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('test_tool');
    expect(diagnostics[0]?.message).toContain('filesystem operations');
  });

  it('should not detect when no side effects', () => {
    const context: BehavioralContext = {
      toolName: 'test_tool',
      sideEffects: [],
    };

    const diagnostics =
      E500SideEffectDetected.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });
});
