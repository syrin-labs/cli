/**
 * E600: Unexpected Test Result
 *
 * Condition: Test's actual outcome doesn't match its expectation
 *
 * Why this is fatal:
 * - Test contract is inaccurate
 * - Tool behavior doesn't match declared guarantees
 * - Can cause false positives/negatives in validation
 * - Indicates mismatch between expectations and reality
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for unexpected test result detection.
 */
export interface UnexpectedTestResultContext {
  /** Tool name */
  toolName: string;
  /** Test name */
  testName: string;
  /** Test input */
  testInput?: Record<string, unknown>;
  /** Expected outcome (success/error/timeout) */
  expectedOutcome: 'success' | 'error' | 'timeout';
  /** Actual outcome (success/error/timeout) */
  actualOutcome: 'success' | 'error' | 'timeout';
  /** Expected error code (if expecting error) */
  expectedErrorCode?: string;
  /** Expected error type (if expecting error) */
  expectedErrorType?: string;
  /** Actual error code (if actual outcome is error) */
  actualErrorCode?: string;
  /** Actual error type (if actual outcome is error) */
  actualErrorType?: string;
  /** Expected error details (if expecting specific error) */
  expectedError?: {
    type?: string;
    details?: Record<string, unknown>;
  };
  /** Actual error details (if actual outcome is error) */
  actualError?: {
    code?: string;
    type?: string;
    message?: string;
  };
}

class E600UnexpectedTestResultRule extends BaseRule {
  readonly id = ERROR_CODES.E600;
  readonly severity = 'error' as const;
  readonly ruleName = 'Unexpected Test Result';
  readonly description =
    "Test's actual outcome doesn't match its expectation. Tool behavior doesn't match declared guarantees.";

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Determine if a diagnostic should be created based on behavioral context.
   */
  private shouldCreateDiagnostic(
    behavioralCtx: UnexpectedTestResultContext
  ): boolean {
    // If outcomes don't match, create diagnostic
    if (behavioralCtx.expectedOutcome !== behavioralCtx.actualOutcome) {
      return true;
    }

    // Outcomes match - check if error details also match (for error cases)
    if (behavioralCtx.expectedOutcome === 'error') {
      const expectedType = behavioralCtx.expectedErrorType?.toLowerCase();
      const actualType = behavioralCtx.actualErrorType?.toLowerCase();

      if (expectedType && actualType && expectedType !== actualType) {
        return true; // Type mismatch
      }
      if (expectedType && !actualType) {
        return true; // Expected type but no actual type
      }

      const expectedCode = behavioralCtx.expectedErrorCode;
      const actualCode = behavioralCtx.actualErrorCode;

      if (expectedCode && actualCode && expectedCode !== actualCode) {
        return true; // Code mismatch
      }
    }

    return false; // Everything matches
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: UnexpectedTestResultContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (!this.shouldCreateDiagnostic(behavioralCtx)) {
      return diagnostics;
    }

    // If we reach here, there's a mismatch - create diagnostic
    let message = `Test "${behavioralCtx.testName}" in tool "${behavioralCtx.toolName}" expected `;

    // Build expected description
    if (behavioralCtx.expectedOutcome === 'success') {
      message += 'success but got ';
      if (behavioralCtx.actualOutcome === 'error') {
        message += `error (${behavioralCtx.actualErrorCode || behavioralCtx.actualErrorType || 'unknown error'})`;
      } else if (behavioralCtx.actualOutcome === 'timeout') {
        message += 'timeout';
      } else {
        message += behavioralCtx.actualOutcome;
      }
    } else if (behavioralCtx.expectedOutcome === 'error') {
      message += `error`;
      if (behavioralCtx.expectedErrorType) {
        message += ` of type "${behavioralCtx.expectedErrorType}"`;
      }
      if (behavioralCtx.expectedErrorCode) {
        message += ` (code: ${behavioralCtx.expectedErrorCode})`;
      }
      message += ' but got ';
      if (behavioralCtx.actualOutcome === 'success') {
        message += 'success';
      } else {
        message += `${behavioralCtx.actualOutcome} (${behavioralCtx.actualErrorCode || behavioralCtx.actualErrorType || 'unknown error'})`;
      }
      if (
        behavioralCtx.actualErrorType &&
        behavioralCtx.expectedErrorType &&
        behavioralCtx.actualErrorType.toLowerCase() !==
          behavioralCtx.expectedErrorType.toLowerCase()
      ) {
        message += ' with different type';
      }
    } else {
      message += `${behavioralCtx.expectedOutcome} but got ${behavioralCtx.actualOutcome}`;
    }

    diagnostics.push(
      this.createDiagnostic(
        message,
        behavioralCtx.toolName,
        undefined,
        'Update test expectation to match actual tool behavior, or fix tool implementation to match declared guarantees. Ensure test expectations accurately reflect tool behavior.',
        {
          testName: behavioralCtx.testName,
          testInput: behavioralCtx.testInput,
          expectedOutcome: behavioralCtx.expectedOutcome,
          actualOutcome: behavioralCtx.actualOutcome,
          expectedError: behavioralCtx.expectedError,
          actualError: behavioralCtx.actualError,
        }
      )
    );

    return diagnostics;
  }
}

export const E600UnexpectedTestResult = new E600UnexpectedTestResultRule();
