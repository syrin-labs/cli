/**
 * E108: Tool Depends on User Input Indirectly
 *
 * Condition:
 * - Tool expects data
 * - Only source is implicit user memory / conversation
 * - No explicit tool provides it
 *
 * Why:
 * - Relies on hallucinated context
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Keywords that suggest user-provided input.
 */
const USER_DATA_INDICATORS = [
  'user',
  'person',
  'name',
  'email',
  'location',
  'address',
  'preference',
] as const;

class E108ImplicitUserInputRule extends BaseRule {
  readonly id = ERROR_CODES.E108;
  readonly severity = 'error' as const;
  readonly ruleName = 'Tool Depends on User Input Indirectly';
  readonly description =
    'Tool depends on implicit user context with no explicit source.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        if (!input.required) {
          continue;
        }

        // Check if there's any tool that provides this input
        // Look for output fields with similar names
        const fieldName = input.name.toLowerCase();
        let hasExplicitSource = false;

        // Token-based matching: split on non-alphanumeric and camelCase boundaries
        // Compute fieldTokens once per field since it only depends on fieldName
        const fieldTokens = new Set(
          fieldName
            .split(/[^\w]+|(?<=[a-z])(?=[A-Z])/)
            .filter(t => t.length > 0)
        );

        for (const otherTool of ctx.tools) {
          if (otherTool.name === tool.name) {
            continue;
          }

          for (const output of otherTool.outputs) {
            const outputName = output.name.toLowerCase();

            // Check for exact match or token-based match
            if (outputName === fieldName) {
              hasExplicitSource = true;
              break;
            }

            // Token-based matching: compute outputTokens per output
            const outputTokens = new Set(
              outputName
                .split(/[^\w]+|(?<=[a-z])(?=[A-Z])/)
                .filter(t => t.length > 0)
            );

            // Check for token intersection
            const hasTokenMatch =
              Array.from(fieldTokens).some(
                token => outputTokens.has(token) && token.length >= 3
              ) ||
              Array.from(outputTokens).some(
                token => fieldTokens.has(token) && token.length >= 3
              );

            if (hasTokenMatch) {
              hasExplicitSource = true;
              break;
            }
          }

          if (hasExplicitSource) {
            break;
          }
        }

        // Also check dependencies
        if (!hasExplicitSource) {
          const hasDependency = ctx.dependencies.some(
            d =>
              d.toTool === tool.name &&
              d.toField === input.name &&
              d.confidence >= 0.6
          );

          if (hasDependency) {
            hasExplicitSource = true;
          }
        }

        // If no explicit source found and input name suggests user data
        const looksLikeUserData = USER_DATA_INDICATORS.some(indicator =>
          fieldName.includes(indicator)
        );

        if (!hasExplicitSource && looksLikeUserData) {
          diagnostics.push(
            this.createDiagnostic(
              `Tool "${tool.name}" depends on implicit user context (parameter: "${input.name}") with no explicit source.`,
              tool.name,
              input.name,
              `Create an explicit tool to provide "${input.name}", or ensure it's clearly documented as user input.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E108ImplicitUserInput = new E108ImplicitUserInputRule();
