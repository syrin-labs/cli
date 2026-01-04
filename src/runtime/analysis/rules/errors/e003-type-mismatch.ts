/**
 * E003: Unsafe Tool Chaining (Type Mismatch)
 *
 * Condition:
 * - Tool A output flows into Tool B input AND
 * - Output type incompatible with input type
 *
 * Why:
 * - Tool chains silently break
 * - Bugs appear "random"
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if two types are incompatible.
 */
function areTypesIncompatible(outputType: string, inputType: string): boolean {
  // Exact match is always compatible
  if (outputType === inputType) {
    return false;
  }

  // String can accept almost anything (it's broad)
  if (inputType === 'string') {
    return false;
  }

  // Incompatible type pairs
  const incompatiblePairs: Array<[string, string]> = [
    ['string', 'number'],
    ['string', 'boolean'],
    ['string', 'integer'],
    ['number', 'boolean'],
    ['boolean', 'number'],
    ['array', 'object'],
    ['object', 'array'],
  ];

  for (const [from, to] of incompatiblePairs) {
    if (outputType === from && inputType === to) {
      return true;
    }
  }

  return false;
}

class E003TypeMismatchRule extends BaseRule {
  readonly id = 'E003';
  readonly severity = 'error' as const;
  readonly ruleName = 'Unsafe Tool Chaining (Type Mismatch)';
  readonly description =
    'Output type incompatible with downstream input type. Tool chains will break.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Only check high-confidence dependencies (>= 0.8)
    const highConfidenceDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.8
    );

    for (const dep of highConfidenceDeps) {
      // Find the output and input fields
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

      // Check type compatibility
      if (areTypesIncompatible(fromField.type, toField.type)) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${dep.toTool}" parameter "${dep.toField}" depends on output from "${dep.fromTool}", but types are incompatible (${fromField.type} → ${toField.type}).`,
            dep.toTool,
            dep.toField,
            `Ensure "${dep.fromTool}" outputs ${toField.type}, or modify "${dep.toTool}" to accept ${fromField.type}.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E003TypeMismatch = new E003TypeMismatchRule();
