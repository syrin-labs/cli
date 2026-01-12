/**
 * E301: Output Explosion
 *
 * Condition: Tool output exceeds declared size limit
 *
 * Why this is fatal:
 * - Large outputs overwhelm LLM context
 * - Breaks agent reasoning
 * - Indicates design issue (pagination, filtering needed)
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for output size validation.
 */
export interface OutputSizeContext {
  /** Tool name */
  toolName: string;
  /** Actual output size in bytes */
  actualSize: number;
  /** Maximum allowed size in bytes */
  maxSize: number;
  /** Size limit string from contract (e.g., "50kb") */
  limitString: string;
}

class E301OutputExplosionRule extends BaseRule {
  readonly id = ERROR_CODES.E301;
  readonly severity = 'error' as const;
  readonly ruleName = 'Output Explosion';
  readonly description =
    'Tool output exceeds declared size limit. Large outputs overwhelm LLM context and break agent reasoning.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(behavioralCtx: OutputSizeContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (behavioralCtx.actualSize > behavioralCtx.maxSize) {
      const actualSizeKB = (behavioralCtx.actualSize / 1024).toFixed(2);
      const maxSizeKB = (behavioralCtx.maxSize / 1024).toFixed(2);

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" returned ${actualSizeKB}KB, exceeding declared limit of ${behavioralCtx.limitString} (${maxSizeKB}KB).`,
          behavioralCtx.toolName,
          undefined,
          `Reduce output size by: paginating results, adding filters, or updating contract limit if legitimate (max_output_size: ${Math.ceil(behavioralCtx.actualSize / 1024)}kb).`
        )
      );
    }

    return diagnostics;
  }
}

export const E301OutputExplosion = new E301OutputExplosionRule();
