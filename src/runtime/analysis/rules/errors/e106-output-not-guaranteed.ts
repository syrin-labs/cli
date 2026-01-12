/**
 * E106: Output Used Downstream but Not Guaranteed
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
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

class E106OutputNotGuaranteedRule extends BaseRule {
  readonly id = ERROR_CODES.E106;
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

      // Find the downstream input field
      const toTool = ctx.indexes.toolIndex.get(dep.toTool.toLowerCase());

      if (!toTool) {
        continue;
      }

      const toField = toTool.inputs.find(f => f.name === dep.toField);

      if (!toField) {
        continue;
      }

      // Check if output is not guaranteed and downstream requires it without fallback
      // (1) Optional upstream always triggers when downstream requires it
      if (!fromField.required && toField.required === true) {
        diagnostics.push(
          this.createDiagnostic(
            `Output of "${dep.fromTool}" (field: "${dep.fromField}") is optional/may be missing but is required by "${dep.toTool}".`,
            dep.toTool,
            dep.toField,
            `Make the output of "${dep.fromTool}" required, or add fallback/handling in "${dep.toTool}" for when the field is missing.`
          )
        );
      }

      // (2) Nullable upstream only triggers when downstream is required AND not nullable (can't handle null)
      if (
        fromField.nullable === true &&
        toField.required === true &&
        toField.nullable !== true
      ) {
        diagnostics.push(
          this.createDiagnostic(
            `Output of "${dep.fromTool}" (field: "${dep.fromField}") is nullable but "${dep.toTool}" cannot accept null.`,
            dep.toTool,
            dep.toField,
            `Make the output of "${dep.fromTool}" non-nullable, or ensure "${dep.toTool}" handles null values.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E106OutputNotGuaranteed = new E106OutputNotGuaranteedRule();
