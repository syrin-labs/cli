/**
 * Tests for E300: Output Validation Failed rule.
 */

import { describe, it, expect } from 'vitest';
import { E300OutputValidationFailed } from './e300-output-validation-failed';
import type { OutputValidationContext } from './e300-output-validation-failed';

describe('E300: Output Validation Failed', () => {
  it('should have correct rule metadata', () => {
    expect(E300OutputValidationFailed.id).toBe('E300');
    expect(E300OutputValidationFailed.severity).toBe('error');
    expect(E300OutputValidationFailed.ruleName).toBe(
      'Output Structure Validation Failed'
    );
  });

  it('should detect output validation failures', () => {
    const context: OutputValidationContext = {
      toolName: 'test_tool',
      testName: 'test_output_mismatch',
      testInput: { input: 'test' },
      expectedOutputSchema: 'ExpectedSchema',
      error: 'Output structure does not match schema',
      details: {
        field: 'result',
        expected: 'object',
        actual: 'string',
      },
    };

    const diagnostics =
      E300OutputValidationFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E300');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('output validation failed');
    expect(diagnostics[0]?.message).toContain('test_output_mismatch');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should work without test name', () => {
    const context: OutputValidationContext = {
      toolName: 'test_tool',
      error: 'Output type mismatch',
    };

    const diagnostics =
      E300OutputValidationFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E300');
    expect(diagnostics[0]?.message).toContain('test_tool');
    expect(diagnostics[0]?.message).toContain('Output type mismatch');
  });
});
