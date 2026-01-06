/**
 * E011: Missing Tool Description
 *
 * Condition:
 * - Tool has no description OR
 * - Tool description is empty or only whitespace
 *
 * Why:
 * - LLM cannot understand what the tool does
 * - Tool selection becomes ambiguous
 * - Critical for tool discovery and usage
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E011MissingToolDescriptionRule extends BaseRule {
  readonly id = 'E011';
  readonly severity = 'error' as const;
  readonly ruleName = 'Missing Tool Description';
  readonly description =
    'Tool is missing a description. LLM cannot understand what the tool does.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      // Check if description is missing or empty/whitespace only
      const hasDescription = Boolean(
        tool.description && tool.description.trim().length > 0
      );

      if (!hasDescription) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${tool.name}" is missing a description.`,
            tool.name,
            undefined,
            `Add a clear description to "${tool.name}" explaining what it does, what inputs it expects, and what it returns.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E011MissingToolDescription = new E011MissingToolDescriptionRule();
