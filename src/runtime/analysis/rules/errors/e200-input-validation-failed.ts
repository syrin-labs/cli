/**
 * E200: Input Validation Failed
 *
 * Condition: Tool input doesn't match declared input schema
 *
 * Why this is fatal:
 * - Tool contract is inaccurate
 * - Tool doesn't handle invalid inputs gracefully
 * - Can cause runtime errors in production
 * - Indicates missing input validation or schema mismatch
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for input validation failure detection.
 */
export interface InputValidationContext {
  /** Tool name */
  toolName: string;
  /** Test name (if applicable) */
  testName?: string;
  /** Test input that caused the failure */
  testInput?: Record<string, unknown>;
  /** Validation error details */
  error?: string;
  /** Parsed error details (field, message, etc.) */
  parsedError?: {
    field?: string;
    message?: string;
    inputValue?: string;
    inputType?: string;
    errorType?: string;
  };
  /** Additional validation details */
  details?: Record<string, unknown>;
}

class E200InputValidationFailedRule extends BaseRule {
  readonly id = ERROR_CODES.E200;
  readonly severity = 'error' as const;
  readonly ruleName = 'Input Validation Failed';
  readonly description =
    "Tool input doesn't match declared input schema. Tool doesn't handle invalid inputs gracefully.";

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Build parsed error message fragment for a field.
   * @param parsed - Parsed error details
   * @param baseError - Base error message as fallback
   * @returns Error message fragment describing the field validation issue
   */
  private buildParsedErrorMessage(
    parsed: InputValidationContext['parsedError'],
    baseError: string
  ): string {
    if (!parsed?.field) {
      return baseError;
    }

    if (parsed.message && parsed.inputType) {
      return `Field "${parsed.field}" - ${parsed.message} (received invalid type ${parsed.inputType})`;
    } else if (parsed.message) {
      return `Field "${parsed.field}" - ${parsed.message}`;
    } else if (parsed.inputType) {
      return `Field "${parsed.field}" received invalid type ${parsed.inputType}`;
    } else {
      return baseError;
    }
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: InputValidationContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Build a clear error message
    const baseError = behavioralCtx.error || 'Invalid input';
    const parsedMessage = this.buildParsedErrorMessage(
      behavioralCtx.parsedError,
      baseError
    );

    const errorDetail = behavioralCtx.parsedError?.field
      ? parsedMessage
      : baseError;
    const scope = behavioralCtx.testName
      ? `Test "${behavioralCtx.testName}" in tool "${behavioralCtx.toolName}"`
      : `Tool "${behavioralCtx.toolName}"`;
    const message = `${scope} input validation failed: ${errorDetail}`;

    diagnostics.push(
      this.createDiagnostic(
        message,
        behavioralCtx.toolName,
        undefined,
        'Fix input validation to handle edge cases gracefully, update input schema to match actual validation, or add proper error handling for invalid inputs.',
        {
          testName: behavioralCtx.testName,
          testInput: behavioralCtx.testInput,
          parsedError: behavioralCtx.parsedError,
          ...behavioralCtx.details,
        }
      )
    );

    return diagnostics;
  }
}

export const E200InputValidationFailed = new E200InputValidationFailedRule();
