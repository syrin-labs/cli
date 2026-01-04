/**
 * E007: Output Used Downstream but Not Guaranteed
 *
 * Condition:
 * - Tool output is optional / nullable
 * - Used downstream without fallback
 *
 * Why:
 * - Silent null propagation
 * - Hard-to-debug failures
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E007OutputNotGuaranteedRule extends BaseRule {
  readonly id = 'E007';
  readonly severity = 'error' as const;
  readonly ruleName = 'Output Used Downstream but Not Guaranteed';
  readonly description =
    'Output of tool is not guaranteed, but is used by downstream tools without fallback.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Only check high-confidence dependencies (>= 0.8)
    const highConfidenceDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.8
    );

    for (const dep of highConfidenceDeps) {
      // Find the output field
      const fromTool = ctx.indexes.toolIndex.get(dep.fromTool.toLowerCase());

      if (!fromTool) {
        continue;
      }

      const fromField = fromTool.outputs.find(f => f.name === dep.fromField);

      if (!fromField) {
        continue;
      }

      // Check if output is nullable or optional
      if (fromField.nullable === true) {
        diagnostics.push(
          this.createDiagnostic(
            `Output of "${dep.fromTool}" (field: "${dep.fromField}") is nullable but is used by "${dep.toTool}" without fallback.`,
            dep.fromTool,
            dep.fromField,
            `Make the output of "${dep.fromTool}" non-nullable, or ensure "${dep.toTool}" handles null values.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E007OutputNotGuaranteed = new E007OutputNotGuaranteedRule();
