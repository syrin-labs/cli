/**
 * E100: Missing Output Schema
 *
 * Condition: Tool does not declare an output schema
 *
 * Why this is fatal:
 * - Downstream tools cannot reason about outputs
 * - LLM will invent structure
 * - Reproducibility is impossible
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';
import { isConceptMatch } from '@/runtime/analysis/semantic-embedding';

class E100MissingOutputSchemaRule extends BaseRule {
  readonly id = ERROR_CODES.E100;
  readonly severity = 'error' as const;
  readonly ruleName = 'Missing Output Schema';
  readonly description =
    'Tool does not declare an output schema. Downstream tools cannot safely consume its output.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      if (!tool.outputs || tool.outputs.length === 0) {
        const suggestsReturnsData = isConceptMatch(
          tool.descriptionEmbedding,
          'RETURNS_DATA',
          0.45
        );

        const hasInputs = tool.inputs && tool.inputs.length > 0;

        if (suggestsReturnsData || hasInputs) {
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
    }

    return diagnostics;
  }
}

export const E100MissingOutputSchema = new E100MissingOutputSchemaRule();
