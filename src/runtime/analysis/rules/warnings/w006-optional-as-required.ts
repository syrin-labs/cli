/**
 * W006: Optional Input Used as Required Downstream
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

class W006OptionalAsRequiredRule extends BaseRule {
  readonly id = 'W006';
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
      const isSourceOptional = fromField.nullable === true;
      const isTargetRequired = toField.required === true;

      if (isSourceOptional && isTargetRequired) {
        diagnostics.push(
          this.createDiagnostic(
            `Optional input "${dep.toField}" in "${dep.toTool}" is treated as required downstream, but source "${dep.fromTool}.${dep.fromField}" is optional/nullable.`,
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

export const W006OptionalAsRequired = new W006OptionalAsRequiredRule();
