/**
 * E002: Underspecified Required Input
 *
 * Condition:
 * - Input parameter is required AND
 * - Type is broad (string, any, object) AND
 * - No description, constraints, enum, regex, or example
 *
 * Why:
 * - LLM will hallucinate values
 * - Tool invocation becomes nondeterministic
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E002UnderspecifiedRequiredInputRule extends BaseRule {
  readonly id = 'E002';
  readonly severity = 'error' as const;
  readonly ruleName = 'Underspecified Required Input';
  readonly description =
    'Required parameter is underspecified. LLM may pass invalid or ambiguous values.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Broad types that need constraints
    const broadTypes = new Set(['string', 'any', 'object']);

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        // Check if type is broad
        if (!broadTypes.has(input.type)) {
          continue;
        }

        // Check if it has any constraints
        const hasDescription = Boolean(
          input.description && input.description.trim()
        );
        const hasEnum = Boolean(input.enum && input.enum.length > 0);
        const hasPattern = Boolean(input.pattern);
        const hasExample = input.example !== undefined;

        // If it's broad and has no constraints, it's underspecified
        if (!hasDescription && !hasEnum && !hasPattern && !hasExample) {
          if (input.required) {
            // Required parameter without constraints - error
            diagnostics.push(
              this.createDiagnostic(
                `Required parameter "${input.name}" in tool "${tool.name}" is underspecified. LLM may pass invalid or ambiguous values.`,
                tool.name,
                input.name,
                `Add constraints to "${input.name}": provide a description, enum values, regex pattern, or example.`
              )
            );
          } else {
            // Optional parameter without constraints - flag as warning since it's less critical
            diagnostics.push(
              this.createDiagnostic(
                `Optional parameter "${input.name}" in tool "${tool.name}" is underspecified. LLM may pass invalid or ambiguous values.`,
                tool.name,
                input.name,
                `Add constraints to "${input.name}": provide a description, enum values, regex pattern, or example.`,
                undefined,
                'warning'
              )
            );
          }
        }
      }
    }

    return diagnostics;
  }
}

export const E002UnderspecifiedRequiredInput =
  new E002UnderspecifiedRequiredInputRule();
