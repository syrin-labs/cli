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

import { BaseRule } from '@/runtime/analysis/rules/base';
import { ERROR_CODES } from '@/runtime/analysis/rules/error-codes';
import type { AnalysisContext, Diagnostic } from '@/runtime/analysis/types';
import {
  findBestMatchingField,
  isConceptMatch,
} from '@/runtime/analysis/semantic-embedding';

class E108ImplicitUserInputRule extends BaseRule {
  readonly id = ERROR_CODES.E108;
  readonly severity = 'error' as const;
  readonly ruleName = 'Tool Depends on User Input Indirectly';
  readonly description =
    'Tool depends on implicit user context with no explicit source.';

  /**
   * Check if field name suggests user data using embeddings.
   */
  private looksLikeUserData(inputEmbedding: number[] | undefined): boolean {
    return isConceptMatch(inputEmbedding, 'USER_DATA', 0.35);
  }

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        if (!input.required) {
          continue;
        }

        let hasExplicitSource = false;

        // Check using pre-computed embeddings for output fields
        const inputEmbedding = tool.inputEmbeddings?.get(input.name);

        for (const otherTool of ctx.tools) {
          if (otherTool.name === tool.name) {
            continue;
          }

          // Try embedding-based matching first
          const match = findBestMatchingField(
            inputEmbedding,
            otherTool.outputEmbeddings,
            0.6
          );

          if (match) {
            hasExplicitSource = true;
            break;
          }

          // Fallback to token matching
          for (const output of otherTool.outputs) {
            const fieldLower = input.name.toLowerCase();
            const outputLower = output.name.toLowerCase();

            if (fieldLower === outputLower) {
              hasExplicitSource = true;
              break;
            }

            // Token intersection
            const fieldTokens = new Set(fieldLower.split(/[\s_]+/));
            const outputTokens = new Set(outputLower.split(/[\s_]+/));
            const hasTokenMatch = [...fieldTokens].some(
              t => t.length >= 3 && outputTokens.has(t)
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

        // Check dependencies
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

        if (!hasExplicitSource && this.looksLikeUserData(inputEmbedding)) {
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
