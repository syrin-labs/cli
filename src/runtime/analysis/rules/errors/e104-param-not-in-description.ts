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

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if a parameter name appears in the description (case-insensitive).
 */
function isParameterMentioned(description: string, paramName: string): boolean {
  const descLower = description.toLowerCase();
  const paramLower = paramName.toLowerCase();

  // Exact match
  if (descLower.includes(paramLower)) {
    return true;
  }

  // Check if words from param name appear in description
  const paramWords = paramLower.split(/\W+/).filter(w => w.length > 2);
  const descWords = descLower.split(/\W+/);

  for (const word of paramWords) {
    if (descWords.includes(word)) {
      return true;
    }
  }

  return false;
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

      for (const input of tool.inputs) {
        // Only check required inputs
        if (!input.required) {
          continue;
        }

        // Check if parameter is mentioned in description
        if (!isParameterMentioned(description, input.name)) {
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
