/**
 * E400: Tool Execution Failed
 *
 * Condition: Tool raises an exception during execution
 *
 * Why this is fatal:
 * - Tool crashes instead of handling errors gracefully
 * - Breaks agent reliability
 * - Indicates missing error handling or input validation
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for execution error detection.
 */
export interface ExecutionErrorContext {
  /** Tool name */
  toolName: string;
  /** Execution errors */
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

class E400ToolExecutionFailedRule extends BaseRule {
  readonly id = ERROR_CODES.E400;
  readonly severity = 'error' as const;
  readonly ruleName = 'Tool Execution Failed';
  readonly description =
    'Tool raises an exception during execution. Tool should handle errors gracefully instead of crashing.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: ExecutionErrorContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (behavioralCtx.errors.length > 0) {
      const errorMessages = behavioralCtx.errors
        .map(e => `  - ${e.message}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" execution failed:\n${errorMessages}`,
          behavioralCtx.toolName,
          undefined,
          'Fix tool implementation errors. Ensure tool handles all input cases gracefully and validates inputs before processing.'
        )
      );
    }

    return diagnostics;
  }
}

export const E400ToolExecutionFailed = new E400ToolExecutionFailedRule();
