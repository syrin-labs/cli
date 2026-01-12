/**
 * Tests for E200: Input Validation Failed rule.
 */

import { describe, it, expect } from 'vitest';
import { E200InputValidationFailed } from './e200-input-validation-failed';
import type { InputValidationContext } from './e200-input-validation-failed';

describe('E200: Input Validation Failed', () => {
  it('should have correct rule metadata', () => {
    expect(E200InputValidationFailed.id).toBe('E200');
    expect(E200InputValidationFailed.severity).toBe('error');
    expect(E200InputValidationFailed.ruleName).toBe('Input Validation Failed');
  });

  it('should detect input validation failures with parsed error', () => {
    const context: InputValidationContext = {
      toolName: 'test_tool',
      testName: 'test_invalid_input',
      testInput: { location: 12345 },
      error: 'Input should be a valid string',
      parsedError: {
        field: 'location',
        message: 'Input should be a valid string',
        inputType: 'int',
        inputValue: '12345',
        errorType: 'string_type',
      },
    };

    const diagnostics =
      E200InputValidationFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E200');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('test_invalid_input');
    expect(diagnostics[0]?.message).toContain('Field "location"');
    expect(diagnostics[0]?.message).toContain('Input should be a valid string');
    expect(diagnostics[0]?.message).toContain('invalid type');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should work with simple error message', () => {
    const context: InputValidationContext = {
      toolName: 'test_tool',
      error: 'Missing required argument',
    };

    const diagnostics =
      E200InputValidationFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E200');
    expect(diagnostics[0]?.message).toContain('Missing required argument');
  });
});
