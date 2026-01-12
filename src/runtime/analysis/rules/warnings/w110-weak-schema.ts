/**
 * W110: Weak Schema
 *
 * Condition: Contract schema is too loose or doesn't match MCP tool schema structure
 *
 * Why this is a warning:
 * - Loose schemas make validation less effective
 * - Mismatch between contract and actual tool schema indicates contract needs update
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for weak schema detection.
 */
export interface WeakSchemaContext {
  /** Tool name */
  toolName: string;
  /** Contract input schema name */
  contractInputSchema: string;
  /** Contract output schema name */
  contractOutputSchema: string;
  /** Whether schemas match actual MCP tool schemas */
  schemasMatch: boolean;
  /** Details about mismatch (if any) */
  mismatchDetails?: string;
}

class W110WeakSchemaRule extends BaseRule {
  readonly id = 'W110';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Weak Schema';
  readonly description =
    'Contract schema is too loose or does not match MCP tool schema structure.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context (schema comparison)
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(behavioralCtx: WeakSchemaContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (!behavioralCtx.schemasMatch) {
      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" contract schemas do not match actual MCP tool schemas.${behavioralCtx.mismatchDetails ? ` ${behavioralCtx.mismatchDetails}` : ''}`,
          behavioralCtx.toolName,
          undefined,
          'Update contract to match actual tool schema structure. Ensure input_schema and output_schema names reference correct schemas.'
        )
      );
    }

    return diagnostics;
  }
}

export const W110WeakSchema = new W110WeakSchemaRule();
