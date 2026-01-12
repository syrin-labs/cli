/**
 * W301: Unstable Defaults
 *
 * Condition: Tool behavior changes significantly with default values
 *
 * Why this is a warning:
 * - Defaults should be stable and predictable
 * - Changing defaults breaks agent expectations
 * - Indicates design inconsistency
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for unstable defaults detection.
 */
export interface UnstableDefaultsContext {
  /** Tool name */
  toolName: string;
  /** Fields with unstable defaults */
  unstableFields: Array<{
    fieldName: string;
    reason: string;
  }>;
}

class W301UnstableDefaultsRule extends BaseRule {
  readonly id = 'W301';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Unstable Defaults';
  readonly description =
    'Tool behavior changes significantly with default values, breaking agent expectations.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: UnstableDefaultsContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (behavioralCtx.unstableFields.length > 0) {
      const fieldList = behavioralCtx.unstableFields
        .map(f => `  - ${f.fieldName}: ${f.reason}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" has unstable default values:\n${fieldList}`,
          behavioralCtx.toolName,
          undefined,
          'Ensure default values are stable and predictable. Avoid defaults that change behavior significantly.'
        )
      );
    }

    return diagnostics;
  }
}

export const W301UnstableDefaults = new W301UnstableDefaultsRule();
