/**
 * Tests for E600: Unexpected Test Result rule.
 */

import { describe, it, expect } from 'vitest';
import { E600UnexpectedTestResult } from './e600-unexpected-test-result';
import type { UnexpectedTestResultContext } from './e600-unexpected-test-result';

describe('E600: Unexpected Test Result', () => {
  it('should have correct rule metadata', () => {
    expect(E600UnexpectedTestResult.id).toBe('E600');
    expect(E600UnexpectedTestResult.severity).toBe('error');
    expect(E600UnexpectedTestResult.ruleName).toBe('Unexpected Test Result');
  });

  it('should detect when error expected but got success', () => {
    const context: UnexpectedTestResultContext = {
      toolName: 'test_tool',
      testName: 'test_should_fail',
      testInput: { input: 'invalid' },
      expectedOutcome: 'error',
      actualOutcome: 'success',
      expectedErrorType: 'input_validation',
    };

    const diagnostics =
      E600UnexpectedTestResult.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E600');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('expected error');
    expect(diagnostics[0]?.message).toContain('but got success');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should detect when success expected but got error', () => {
    const context: UnexpectedTestResultContext = {
      toolName: 'test_tool',
      testName: 'test_should_succeed',
      testInput: { input: 'valid' },
      expectedOutcome: 'success',
      actualOutcome: 'error',
      actualErrorCode: 'E400',
      actualErrorType: 'input_validation',
    };

    const diagnostics =
      E600UnexpectedTestResult.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E600');
    expect(diagnostics[0]?.message).toContain('expected success');
    expect(diagnostics[0]?.message).toContain('error');
  });

  it('should detect when wrong error type received', () => {
    const context: UnexpectedTestResultContext = {
      toolName: 'test_tool',
      testName: 'test_wrong_error',
      testInput: { input: 'test' },
      expectedOutcome: 'error',
      actualOutcome: 'error',
      expectedErrorType: 'input_validation',
      actualErrorType: 'execution_error',
      expectedErrorCode: 'E400',
      actualErrorCode: 'E500',
    };

    const diagnostics =
      E600UnexpectedTestResult.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E600');
    expect(diagnostics[0]?.message).toContain('expected error of type');
    expect(diagnostics[0]?.message).toContain('but got error');
  });

  it('should not detect when expectations match', () => {
    const context: UnexpectedTestResultContext = {
      toolName: 'test_tool',
      testName: 'test_correct_error',
      testInput: { input: 'test' },
      expectedOutcome: 'error',
      actualOutcome: 'error',
      expectedErrorType: 'input_validation',
      actualErrorType: 'input_validation',
      expectedErrorCode: 'E400',
      actualErrorCode: 'E400',
    };

    const diagnostics =
      E600UnexpectedTestResult.checkWithBehavioralContext(context);

    // When expectations match, no diagnostic should be created
    expect(diagnostics.length).toBe(0);
  });
});
