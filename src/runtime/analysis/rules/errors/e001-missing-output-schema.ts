/**
 * E001: Missing Output Schema
 *
 * Condition: Tool does not declare an output schema
 *
 * Why this is fatal:
 * - Downstream tools cannot reason about outputs
 * - LLM will invent structure
 * - Reproducibility is impossible
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E001MissingOutputSchemaRule extends BaseRule {
  readonly id = 'E001';
  readonly severity = 'error' as const;
  readonly ruleName = 'Missing Output Schema';
  readonly description =
    'Tool does not declare an output schema. Downstream tools cannot safely consume its output.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      // Check if tool has no output fields
      if (!tool.outputs || tool.outputs.length === 0) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${tool.name}" has no output schema. Downstream tools cannot safely consume its output.`,
            tool.name,
            undefined,
            'Add an output schema to the tool definition to specify the structure of the output.'
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E001MissingOutputSchema = new E001MissingOutputSchemaRule();
