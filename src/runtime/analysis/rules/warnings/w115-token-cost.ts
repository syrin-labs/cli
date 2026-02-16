/**
 * W115: Token Cost Estimation
 *
 * Condition:
 * - Estimate tokens for all tool docs + complexity factor
 *
 * Why:
 * - Context bloat is #1 developer complaint
 * - Helps identify tools that may cause LLM context issues
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

const TOKEN_ESTIMATE_PER_CHAR = 0.25;
const TOKEN_ESTIMATE_PER_SCHEMA_PROP = 20;
const HIGH_TOKEN_THRESHOLD = 1000;

class W115TokenCostRule extends BaseRule {
  readonly id = 'W115';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Token Cost Estimation';
  readonly description =
    'Tools with high token counts may cause context bloat and LLM performance issues.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      let tokenEstimate = 0;

      // Estimate from description (roughly 1 token per 4 chars)
      tokenEstimate +=
        (tool.description?.length || 0) * TOKEN_ESTIMATE_PER_CHAR;

      // Estimate from input schema
      for (const field of tool.inputs) {
        tokenEstimate += TOKEN_ESTIMATE_PER_SCHEMA_PROP;
        if (field.description) {
          tokenEstimate += field.description.length * TOKEN_ESTIMATE_PER_CHAR;
        }
      }

      // Estimate from output schema
      for (const field of tool.outputs) {
        tokenEstimate += TOKEN_ESTIMATE_PER_SCHEMA_PROP;
        if (field.description) {
          tokenEstimate += field.description.length * TOKEN_ESTIMATE_PER_CHAR;
        }
      }

      if (tokenEstimate > HIGH_TOKEN_THRESHOLD) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${tool.name}" has estimated ${Math.round(tokenEstimate)} tokens which may cause context bloat.`,
            tool.name,
            undefined,
            `Consider simplifying the tool description and schema to reduce token count.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W115TokenCost = new W115TokenCostRule();
