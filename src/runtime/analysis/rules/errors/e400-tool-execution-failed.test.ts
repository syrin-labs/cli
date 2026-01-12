/**
 * Tests for E400: Tool Execution Failed rule.
 */

import { describe, it, expect } from 'vitest';
import { E400ToolExecutionFailed } from './e400-tool-execution-failed';
import type { ExecutionErrorContext } from './e400-tool-execution-failed';
import { ERROR_CODES } from '../error-codes';

describe('E400: Tool Execution Failed', () => {
  it('should have correct rule metadata', () => {
    expect(E400ToolExecutionFailed.id).toBe(ERROR_CODES.E400);
    expect(E400ToolExecutionFailed.severity).toBe('error');
    expect(E400ToolExecutionFailed.ruleName).toBe('Tool Execution Failed');
  });

  it('should detect execution errors', () => {
    const context: ExecutionErrorContext = {
      toolName: 'test_tool',
      errors: [
        {
          message:
            "Error calling tool 'test_tool': Execution failed for data: test",
          code: ERROR_CODES.E400,
        },
        {
          message: 'ValueError: Invalid operation',
        },
      ],
    };

    const diagnostics =
      E400ToolExecutionFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe(ERROR_CODES.E400);
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('test_tool');
    expect(diagnostics[0]?.message).toContain('execution failed');
    expect(diagnostics[0]?.message).toContain(
      'Execution failed for data: test'
    );
    expect(diagnostics[0]?.message).toContain('ValueError: Invalid operation');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should not detect when no errors', () => {
    const context: ExecutionErrorContext = {
      toolName: 'test_tool',
      errors: [],
    };

    const diagnostics =
      E400ToolExecutionFailed.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });
});
