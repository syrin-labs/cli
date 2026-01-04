/**
 * W007: Output Schema Too Broad
 *
 * Condition:
 * - Output type is object with no properties
 * - Or any
 *
 * Why:
 * - No contract enforcement
 * - Breaks evolution
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class W007BroadOutputSchemaRule extends BaseRule {
  readonly id = 'W007';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Output Schema Too Broad';
  readonly description =
    'Output schema of tool is too broad. No contract enforcement.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const output of tool.outputs) {
        // Check if output is "any" type
        if (output.type === 'any') {
          diagnostics.push(
            this.createDiagnostic(
              `Output schema of "${tool.name}" (field: "${output.name}") is too broad (type: "any").`,
              tool.name,
              output.name,
              `Specify a concrete type for "${output.name}" instead of "any".`
            )
          );
        }

        // Check if output is object with no properties
        if (
          output.type === 'object' &&
          (!output.properties || output.properties.length === 0)
        ) {
          diagnostics.push(
            this.createDiagnostic(
              `Output schema of "${tool.name}" (field: "${output.name}") is an object with no properties defined.`,
              tool.name,
              output.name,
              `Define the properties of the object schema for "${output.name}".`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const W007BroadOutputSchema = new W007BroadOutputSchemaRule();
