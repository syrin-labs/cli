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

/**
 * Keywords that suggest a tool returns data (and thus needs an output schema).
 */
const RETURN_KEYWORDS = [
  'return',
  'get',
  'fetch',
  'retrieve',
  'search',
  'query',
  'find',
  'list',
  'read',
];

class E100MissingOutputSchemaRule extends BaseRule {
  readonly id = ERROR_CODES.E100;
  readonly severity = 'error' as const;
  readonly ruleName = 'Missing Output Schema';
  readonly description =
    'Tool does not declare an output schema. Downstream tools cannot safely consume its output.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      // Check if tool has no output fields
      if (!tool.outputs || tool.outputs.length === 0) {
        // v1.5.0: Tune threshold to reduce false positives for pre-2025 MCP servers
        // Only flag as error if tool description suggests it returns data
        const description = tool.description?.toLowerCase() || '';
        const name = tool.name?.toLowerCase() || '';

        // Check if tool name or description suggests it returns data
        const suggestsReturnsData = RETURN_KEYWORDS.some(
          keyword => description.includes(keyword) || name.includes(keyword)
        );

        // Also check if tool has inputs - tools with inputs likely do meaningful work
        const hasInputs = tool.inputs && tool.inputs.length > 0;

        // Only report error if tool suggests it returns data OR has inputs
        // This reduces false positives for simple utility tools that don't return anything
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
