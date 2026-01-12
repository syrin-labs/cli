/**
 * W105: Optional Input Used as Required Downstream
 *
 * Condition:
 * - Input marked optional
 * - Treated as required in chaining
 *
 * Why:
 * - Hidden contract violation
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class W105OptionalAsRequiredRule extends BaseRule {
  readonly id = 'W105';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Optional Input Used as Required Downstream';
  readonly description =
    'Optional input is treated as required downstream. Hidden contract violation.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check high-confidence dependencies (>= 0.8)
    const highConfidenceDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.8
    );

    for (const dep of highConfidenceDeps) {
      // Find the source output
      const fromTool = ctx.indexes.toolIndex.get(dep.fromTool.toLowerCase());
      const toTool = ctx.indexes.toolIndex.get(dep.toTool.toLowerCase());

      if (!fromTool || !toTool) {
        continue;
      }

      const fromField = fromTool.outputs.find(f => f.name === dep.fromField);
      const toField = toTool.inputs.find(f => f.name === dep.toField);

      if (!fromField || !toField) {
        continue;
      }

      // Check if source is optional/nullable but target is required
      // Source is optional if: nullable === true OR required === false
      const isSourceOptional =
        fromField.nullable === true || fromField.required === false;
      const isTargetRequired = toField.required === true;

      if (isSourceOptional && isTargetRequired) {
        diagnostics.push(
          this.createDiagnostic(
            `Source field "${dep.fromTool}.${dep.fromField}" is nullable/optional but is being wired into required input "${dep.toTool}.${dep.toField}".`,
            dep.toTool,
            dep.toField,
            `Make "${dep.fromTool}.${dep.fromField}" non-nullable, or make "${dep.toTool}.${dep.toField}" optional.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W105OptionalAsRequired = new W105OptionalAsRequiredRule();
