/**
 * W005: Tool Description Too Generic
 *
 * Condition:
 * - Description uses vague verbs:
 *   - "get"
 *   - "handle"
 *   - "process"
 * - No concrete nouns
 *
 * Why:
 * - LLM cannot discriminate tools
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if description is too generic.
 */
function isGenericDescription(description: string): boolean {
  const descLower = description.toLowerCase();

  // Vague verbs
  const vagueVerbs = ['get', 'handle', 'process', 'do', 'make', 'use', 'call'];

  // Check for vague verbs without concrete nouns
  let hasVagueVerb = false;
  for (const verb of vagueVerbs) {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(descLower)) {
      hasVagueVerb = true;
      break;
    }
  }

  if (!hasVagueVerb) {
    return false;
  }

  // Concrete nouns that would make it specific
  const concreteNouns = [
    'weather',
    'location',
    'user',
    'file',
    'data',
    'email',
    'message',
    'order',
    'payment',
    'product',
    'customer',
    'account',
    'transaction',
    'request',
    'response',
  ];

  // Check if description has concrete nouns
  const hasConcreteNoun = concreteNouns.some(noun => descLower.includes(noun));

  // If has vague verb but no concrete noun, it's generic
  return !hasConcreteNoun;
}

class W005GenericDescriptionRule extends BaseRule {
  readonly id = 'W005';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Tool Description Too Generic';
  readonly description =
    'Description of tool is too generic. LLM cannot discriminate tools.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';

      if (isGenericDescription(description)) {
        diagnostics.push(
          this.createDiagnostic(
            `Description of "${tool.name}" is too generic.`,
            tool.name,
            undefined,
            `Make the description more specific by including concrete nouns and specific actions (e.g., "Get weather data for a location" instead of "Get data").`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W005GenericDescription = new W005GenericDescriptionRule();
