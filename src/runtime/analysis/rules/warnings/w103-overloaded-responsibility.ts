/**
 * W103: Overloaded Tool Responsibility
 *
 * Condition:
 * - Tool does multiple conceptual things
 * - Description contains multiple verbs or intents
 *
 * Why:
 * - Tool selection becomes unstable
 * - Hard to compose
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Count verbs in a description.
 */
function countVerbs(description: string): number {
  const commonVerbs = [
    'get',
    'set',
    'create',
    'delete',
    'update',
    'find',
    'search',
    'fetch',
    'send',
    'receive',
    'process',
    'handle',
    'execute',
    'run',
    'call',
    'invoke',
    'parse',
    'format',
    'validate',
    'transform',
    'convert',
    'merge',
    'split',
    'filter',
    'sort',
    'save',
    'load',
    'read',
    'write',
  ];

  const descLower = description.toLowerCase();
  let verbCount = 0;

  for (const verb of commonVerbs) {
    // Check if verb appears as a word (not just as part of another word)
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(descLower)) {
      verbCount++;
    }
  }

  return verbCount;
}

/**
 * Count distinct intents (action + object pairs).
 */
function countIntents(description: string): number {
  // Simple heuristic: split on connectors ("and", "or", commas) to count intents
  // Use combined regex to handle multiple different connectors in one pass
  const descLower = description.toLowerCase();
  const combinedRegex = /(?:\s+and\s+|\s+or\s+|,\s*)/i;
  const parts = descLower.split(combinedRegex).filter(Boolean);
  return parts.length;
}

class W103OverloadedResponsibilityRule extends BaseRule {
  readonly id = 'W103';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Overloaded Tool Responsibility';
  readonly description =
    'Tool appears to handle multiple responsibilities. Tool selection becomes unstable.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';

      // Count verbs and intents
      const verbCount = countVerbs(description);
      const intentCount = countIntents(description);

      // If too many verbs (>3) or multiple intents (>2), it's overloaded
      if (verbCount > 3 || intentCount > 2) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${tool.name}" appears to handle multiple responsibilities.`,
            tool.name,
            undefined,
            `Split "${tool.name}" into multiple focused tools, each handling a single responsibility.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W103OverloadedResponsibility =
  new W103OverloadedResponsibilityRule();
