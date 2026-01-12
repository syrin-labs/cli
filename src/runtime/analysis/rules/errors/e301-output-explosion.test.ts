/**
 * Tests for E301: Output Explosion rule.
 */

import { describe, it, expect } from 'vitest';
import { E301OutputExplosion } from './e301-output-explosion';
import type { OutputSizeContext } from './e301-output-explosion';

describe('E301: Output Explosion', () => {
  it('should have correct rule metadata', () => {
    expect(E301OutputExplosion.id).toBe('E301');
    expect(E301OutputExplosion.severity).toBe('error');
    expect(E301OutputExplosion.ruleName).toBe('Output Explosion');
  });

  it('should detect output size exceeding limit', () => {
    const context: OutputSizeContext = {
      toolName: 'test_tool',
      actualSize: 1024 * 1024, // 1MB
      maxSize: 50 * 1024, // 50KB
      limitString: '50kb',
    };

    const diagnostics = E301OutputExplosion.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E301');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('exceeding');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should not detect when output size is within limit', () => {
    const context: OutputSizeContext = {
      toolName: 'test_tool',
      actualSize: 10 * 1024, // 10KB
      maxSize: 50 * 1024, // 50KB
      limitString: '50kb',
    };

    const diagnostics = E301OutputExplosion.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });
});
