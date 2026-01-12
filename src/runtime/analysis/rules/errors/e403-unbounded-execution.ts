/**
 * E403: Unbounded Execution
 *
 * Condition: Tool execution timed out or failed to terminate
 *
 * Why this is fatal:
 * - Tool may hang indefinitely
 * - Breaks agent reliability
 * - Indicates design issue (missing timeouts, infinite loops)
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Format timeout in milliseconds to human-readable string.
 */
function formatTimeout(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = Math.floor(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return `${m}m`;
  }
  const h = Math.floor(m / 60);
  return `${h}h`;
}

/**
 * Context for unbounded execution detection.
 */
export interface UnboundedExecutionContext {
  /** Tool name */
  toolName: string;
  /** Whether execution timed out */
  timedOut: boolean;
  /** Declared max execution time (e.g., "5m", "2h") or undefined if using default */
  declaredTimeout?: string;
  /** Actual timeout used in milliseconds */
  actualTimeoutMs?: number;
  /** Execution errors */
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

class E403UnboundedExecutionRule extends BaseRule {
  readonly id = ERROR_CODES.E403;
  readonly severity = 'error' as const;
  readonly ruleName = 'Unbounded Execution';
  readonly description =
    'Tool execution timed out or failed to terminate. Tool may hang indefinitely, breaking agent reliability.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: UnboundedExecutionContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (behavioralCtx.timedOut) {
      const timeoutInfo = behavioralCtx.declaredTimeout
        ? ` (exceeded declared timeout: ${behavioralCtx.declaredTimeout})`
        : behavioralCtx.actualTimeoutMs
          ? ` (exceeded default timeout: ${formatTimeout(behavioralCtx.actualTimeoutMs)})`
          : '';

      const suggestion = behavioralCtx.declaredTimeout
        ? `Tool exceeded its declared max_execution_time (${behavioralCtx.declaredTimeout}). Either fix the tool to complete within this time, or update the contract if a longer timeout is legitimate.`
        : 'Add timeouts, fix infinite loops, or optimize slow operations. If tool legitimately takes longer, declare max_execution_time in contract (e.g., "5m", "2h").';

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" execution timed out${timeoutInfo}. Tool may hang indefinitely.`,
          behavioralCtx.toolName,
          undefined,
          suggestion
        )
      );
    }

    if (behavioralCtx.errors.length > 0 && !behavioralCtx.timedOut) {
      const errorMessages = behavioralCtx.errors
        .map(e => `  - ${e.message}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" execution failed:\n${errorMessages}`,
          behavioralCtx.toolName,
          undefined,
          'Fix tool implementation errors. Ensure tool handles all input cases gracefully.'
        )
      );
    }

    return diagnostics;
  }
}

export const E403UnboundedExecution = new E403UnboundedExecutionRule();
