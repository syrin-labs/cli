/**
 * W109: Tool Output Not Reusable
 *
 * Condition:
 * - Output tailored only for natural language
 * - Not structured for reuse
 *
 * Why:
 * - Limits composability
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if output appears to be only for natural language display.
 */
function isNaturalLanguageOnly(output: {
  name: string;
  type: string;
  description?: string;
}): boolean {
  const name = output.name.toLowerCase();
  const desc = (output.description || '').toLowerCase();
  const combined = `${name} ${desc}`;

  // Indicators that output is only for display
  const displayOnlyIndicators = [
    'message',
    'response',
    'reply',
    'answer',
    'text',
    'description',
    'summary',
    'note',
    'comment',
    'info',
  ];

  // If it's a string type and name suggests display-only
  if (output.type === 'string') {
    return displayOnlyIndicators.some(indicator =>
      combined.includes(indicator)
    );
  }

  return false;
}

class W109OutputNotReusableRule extends BaseRule {
  readonly id = 'W109';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Tool Output Not Reusable';
  readonly description =
    'Output of tool is not designed for reuse. Limits composability.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      // Only check tools that have outputs
      if (tool.outputs.length === 0) {
        continue;
      }

      // Check if all outputs are natural language only
      // Note: isNaturalLanguageOnly and isStructured are mutually exclusive,
      // so if allNaturalLanguage is true, hasStructured must be false
      const allNaturalLanguage: boolean = tool.outputs.every(output =>
        isNaturalLanguageOnly(output)
      );

      // If all outputs are natural language only (implies none are structured)
      if (allNaturalLanguage) {
        diagnostics.push(
          this.createDiagnostic(
            `Output of "${tool.name}" is not designed for reuse (only natural language output).`,
            tool.name,
            undefined,
            `Add structured output fields (objects/arrays) to "${tool.name}" to improve composability with other tools.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W109OutputNotReusable = new W109OutputNotReusableRule();
