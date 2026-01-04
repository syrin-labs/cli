/**
 * W002: Free-Text Output Without Normalization
 *
 * Condition:
 * - Output is string
 * - Not constrained or normalized
 * - Even if not chained
 *
 * Why:
 * - Hard to reuse
 * - Hard to evolve
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class W002FreeTextWithoutNormalizationRule extends BaseRule {
  readonly id = 'W002';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Free-Text Output Without Normalization';
  readonly description =
    'Tool returns unconstrained free text. Consider normalizing output.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const output of tool.outputs) {
        // Check if output is unconstrained string
        if (output.type !== 'string') {
          continue;
        }

        const hasEnum = Boolean(output.enum && output.enum.length > 0);
        const hasPattern = Boolean(output.pattern);
        const hasDescription = Boolean(
          output.description && output.description.trim()
        );

        // If it's a string with no constraints, it's unconstrained free text
        if (!hasEnum && !hasPattern && !hasDescription) {
          diagnostics.push(
            this.createDiagnostic(
              `Tool "${tool.name}" returns unconstrained free text (field: "${output.name}"). Consider normalizing output.`,
              tool.name,
              output.name,
              `Add constraints to the output: enum values, regex pattern, or a clear description of the expected format.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const W002FreeTextWithoutNormalization =
  new W002FreeTextWithoutNormalizationRule();
