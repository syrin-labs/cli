/**
 * E105: Unsafe Tool Chaining (Free Text Propagation)
 *
 * Condition:
 * - Output is unconstrained string
 * - Used as input to another tool
 *
 * Why:
 * - LLM passes sentences instead of data
 * - Most common real-world failure
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

class E105FreeTextPropagationRule extends BaseRule {
  readonly id = ERROR_CODES.E105;
  readonly severity = 'error' as const;
  readonly ruleName = 'Unsafe Tool Chaining (Free Text Propagation)';
  readonly description =
    'Free-text output is used by another tool. This is unsafe without constraints.';

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

      // Check if output is unconstrained string
      const isString = fromField.type === 'string';
      const hasEnum = Boolean(fromField.enum && fromField.enum.length > 0);
      const hasPattern = Boolean(fromField.pattern);

      // If it's a string with no constraints (enum/pattern), it's free text
      // Note: hasDescription is NOT a constraint, only documentation
      if (isString && !hasEnum && !hasPattern) {
        diagnostics.push(
          this.createDiagnostic(
            `Free-text output from "${dep.fromTool}" (field: "${dep.fromField}") is used by "${dep.toTool}". This is unsafe without constraints.`,
            dep.toTool,
            dep.toField,
            `Constrain the output of "${dep.fromTool}" by adding enum values or regex pattern.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E105FreeTextPropagation = new E105FreeTextPropagationRule();
