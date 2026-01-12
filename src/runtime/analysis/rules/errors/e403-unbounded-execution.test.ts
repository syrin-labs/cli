/**
 * Tests for E403: Unbounded Execution rule.
 */

import { describe, it, expect } from 'vitest';
import { E403UnboundedExecution } from './e403-unbounded-execution';
import type { UnboundedExecutionContext } from './e403-unbounded-execution';

describe('E403: Unbounded Execution', () => {
  it('should have correct rule metadata', () => {
    expect(E403UnboundedExecution.id).toBe('E403');
    expect(E403UnboundedExecution.severity).toBe('error');
    expect(E403UnboundedExecution.ruleName).toBe('Unbounded Execution');
  });

  it('should detect timeout', () => {
    const context: UnboundedExecutionContext = {
      toolName: 'test_tool',
      timedOut: true,
      errors: [],
    };

    const diagnostics =
      E403UnboundedExecution.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E403');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('timed out');
  });

  it('should include declared timeout in timeout message', () => {
    const context: UnboundedExecutionContext = {
      toolName: 'test_tool',
      timedOut: true,
      declaredTimeout: '5m',
      errors: [],
    };

    const diagnostics =
      E403UnboundedExecution.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.message).toContain('exceeded declared timeout: 5m');
  });

  it('should include default timeout in timeout message', () => {
    const context: UnboundedExecutionContext = {
      toolName: 'test_tool',
      timedOut: true,
      actualTimeoutMs: 30000,
      errors: [],
    };

    const diagnostics =
      E403UnboundedExecution.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.message).toContain('exceeded default timeout: 30s');
  });

  it('should detect execution errors', () => {
    const context: UnboundedExecutionContext = {
      toolName: 'test_tool',
      timedOut: false,
      errors: [{ message: 'Execution failed', code: 'EXECUTION_ERROR' }],
    };

    const diagnostics =
      E403UnboundedExecution.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.message).toContain('execution failed');
  });

  it('should not detect when execution succeeds', () => {
    const context: UnboundedExecutionContext = {
      toolName: 'test_tool',
      timedOut: false,
      errors: [],
    };

    const diagnostics =
      E403UnboundedExecution.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });
});
