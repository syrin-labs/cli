/**
 * E300: Output Structure Validation Failed
 *
 * Condition: Tool output doesn't match declared output schema
 *
 * Why this is fatal:
 * - Tool contract is inaccurate
 * - Breaks agent's ability to reason about tool outputs
 * - Can cause downstream errors in tool chains
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for output validation failure detection.
 */
export interface OutputValidationContext {
  /** Tool name */
  toolName: string;
  /** Test name (if applicable) */
  testName?: string;
  /** Test input that caused the failure */
  testInput?: Record<string, unknown>;
  /** Expected output schema name */
  expectedOutputSchema?: string;
  /** Validation error details */
  error?: string;
  /** Additional validation details */
  details?: Record<string, unknown>;
}

class E300OutputValidationFailedRule extends BaseRule {
  readonly id = ERROR_CODES.E300;
  readonly severity = 'error' as const;
  readonly ruleName = 'Output Structure Validation Failed';
  readonly description =
    "Tool output doesn't match declared output schema. This breaks agent's ability to reason about tool outputs.";

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: OutputValidationContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const errorMessage =
      behavioralCtx.error || 'Output structure does not match schema';
    let message = `Tool "${behavioralCtx.toolName}" output validation failed: ${errorMessage}`;

    if (behavioralCtx.testName) {
      message = `Test "${behavioralCtx.testName}" in tool "${behavioralCtx.toolName}" output validation failed: ${errorMessage}`;
    }

    // Merge details, filtering out undefined values
    const details = Object.fromEntries(
      Object.entries({
        ...behavioralCtx.details,
        testName: behavioralCtx.testName,
        testInput: behavioralCtx.testInput,
        expectedOutputSchema: behavioralCtx.expectedOutputSchema,
      }).filter(([, v]) => v !== undefined)
    );

    diagnostics.push(
      this.createDiagnostic(
        message,
        behavioralCtx.toolName,
        undefined,
        'Fix output structure to match declared schema or update schema to match actual output. Ensure output schema accurately reflects tool behavior.',
        details
      )
    );

    return diagnostics;
  }
}

export const E300OutputValidationFailed = new E300OutputValidationFailedRule();
