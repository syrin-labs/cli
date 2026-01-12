/**
 * E500: Side Effect Detected
 *
 * Condition: Tool attempts filesystem writes to project files (not temp directory)
 *
 * Why this is fatal:
 * - Tools should not mutate project state
 * - Breaks isolation and testability
 * - Makes behavior unpredictable
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';
import { ERROR_CODES } from '../error-codes';

/**
 * Context for behavioral validation results.
 * This extends the static analysis context with runtime observation data.
 */
export interface BehavioralContext {
  /** Tool name */
  toolName: string;
  /** Side effects detected */
  sideEffects: Array<{
    operation: string;
    path: string;
  }>;
}

class E500SideEffectDetectedRule extends BaseRule {
  readonly id = ERROR_CODES.E500;
  readonly severity = 'error' as const;
  readonly ruleName = 'Side Effect Detected';
  readonly description =
    'Tool attempted filesystem write to project files. Tools should not mutate project state.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // This rule requires behavioral context (from runtime testing)
    // It will be called with behavioral data from the test orchestrator
    // For now, return empty - actual checking happens in test orchestrator

    return diagnostics;
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(behavioralCtx: BehavioralContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (behavioralCtx.sideEffects.length > 0) {
      const sideEffectList = behavioralCtx.sideEffects
        .map(se => `  - ${se.operation}: ${se.path}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" attempted filesystem operations on project files:\n${sideEffectList}`,
          behavioralCtx.toolName,
          undefined,
          'Remove filesystem writes or write only to temp directory. Tools should not mutate project state.'
        )
      );
    }

    return diagnostics;
  }
}

export const E500SideEffectDetected = new E500SideEffectDetectedRule();
