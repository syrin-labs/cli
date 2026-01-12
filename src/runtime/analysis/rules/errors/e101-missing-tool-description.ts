/**
 * E101: Missing Tool Description
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
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

class E101MissingToolDescriptionRule extends BaseRule {
  readonly id = ERROR_CODES.E101;
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

export const E101MissingToolDescription = new E101MissingToolDescriptionRule();
