/**
 * E104: Required Input Not Mentioned in Description
 *
 * Condition:
 * - Required input exists
 * - Tool description does not reference it directly or indirectly
 *
 * Why:
 * - LLM does not know parameter exists or matters
 */

import { BaseRule } from '@/runtime/analysis/rules/base';
import { ERROR_CODES } from '@/runtime/analysis/rules/error-codes';
import type { AnalysisContext, Diagnostic } from '@/runtime/analysis/types';
import { isFieldMentionedWithEmbedding } from '@/runtime/analysis/semantic-embedding';

/**
 * Basic token-based check if param is mentioned in description.
 */
function isParamTokenMentioned(
  description: string,
  paramName: string
): boolean {
  const descLower = description.toLowerCase();
  const paramLower = paramName.toLowerCase();

  if (descLower.includes(paramLower)) return true;

  const paramWords = paramLower.split(/[\s_]+/).filter(w => w.length > 1);
  const descWords = descLower.split(/[\s_]+/);

  return paramWords.some(word => descWords.includes(word));
}

class E104ParamNotInDescriptionRule extends BaseRule {
  readonly id = ERROR_CODES.E104;
  readonly severity = 'error' as const;
  readonly ruleName = 'Required Input Not Mentioned in Description';
  readonly description =
    'Required parameter is not referenced in tool description. LLM may not know parameter exists.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';
      const descEmbedding = tool.descriptionEmbedding;
      const inputEmbeddings = tool.inputEmbeddings;

      for (const input of tool.inputs) {
        if (!input.required) {
          continue;
        }

        // First try basic token match (works without embeddings)
        const isTokenMentioned = isParamTokenMentioned(description, input.name);

        if (isTokenMentioned) {
          continue;
        }

        // Then try embedding-based semantic match (if available)
        const fieldEmbedding = inputEmbeddings?.get(input.name);
        const isSemanticMentioned = isFieldMentionedWithEmbedding(
          descEmbedding,
          fieldEmbedding,
          0.5
        );

        if (!isSemanticMentioned) {
          diagnostics.push(
            this.createDiagnostic(
              `Required parameter "${input.name}" is not referenced in "${tool.name}" description.`,
              tool.name,
              input.name,
              `Mention "${input.name}" in the tool description so the LLM knows it exists and is required.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E104ParamNotInDescription = new E104ParamNotInDescriptionRule();
