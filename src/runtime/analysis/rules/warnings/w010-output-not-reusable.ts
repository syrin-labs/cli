/**
 * W010: Tool Output Not Reusable
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

/**
 * Check if output is structured (object or array).
 */
function isStructured(output: { type: string; properties?: unknown }): boolean {
  if (output.type === 'object' || output.type === 'array') {
    return true;
  }
  if (output.properties && typeof output.properties === 'object') {
    if (Array.isArray(output.properties) && output.properties.length > 0) {
      return true;
    }
    // Also check if it's a Record with keys
    if (
      !Array.isArray(output.properties) &&
      Object.keys(output.properties).length > 0
    ) {
      return true;
    }
  }
  return false;
}

class W010OutputNotReusableRule extends BaseRule {
  readonly id = 'W010';
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
      const allNaturalLanguage: boolean = tool.outputs.every(output =>
        isNaturalLanguageOnly(output)
      );
      const hasStructured: boolean = tool.outputs.some(output =>
        isStructured(output)
      );

      // If all outputs are natural language and none are structured
      if (allNaturalLanguage && !hasStructured) {
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

export const W010OutputNotReusable = new W010OutputNotReusableRule();
