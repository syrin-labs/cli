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
 * Default list of concrete nouns that make a description specific.
 * This list can be extended or overridden when creating a custom rule instance.
 *
 * @example
 * ```ts
 * import { createW005Rule, DEFAULT_CONCRETE_NOUNS } from './w005-generic-description';
 * const customNouns = [...DEFAULT_CONCRETE_NOUNS, 'invoice', 'report'];
 * const customRule = createW005Rule(customNouns);
 * ```
 */
export const DEFAULT_CONCRETE_NOUNS = [
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
] as const;

/**
 * Check if description is too generic.
 *
 * @param description - Tool description to check
 * @param concreteNouns - Optional list of concrete nouns (defaults to DEFAULT_CONCRETE_NOUNS)
 */
function isGenericDescription(
  description: string,
  concreteNouns: readonly string[] = DEFAULT_CONCRETE_NOUNS
): boolean {
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

  constructor(
    private readonly concreteNouns: readonly string[] = DEFAULT_CONCRETE_NOUNS
  ) {
    super();
  }

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';

      if (isGenericDescription(description, this.concreteNouns)) {
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

/**
 * Create a W005 rule instance with custom concrete nouns.
 *
 * @param concreteNouns - Optional list of concrete nouns (defaults to DEFAULT_CONCRETE_NOUNS)
 * @returns A new W005GenericDescriptionRule instance
 *
 * @example
 * ```ts
 * import { createW005Rule, DEFAULT_CONCRETE_NOUNS } from './w005-generic-description';
 * const customNouns = [...DEFAULT_CONCRETE_NOUNS, 'invoice', 'report'];
 * const customRule = createW005Rule(customNouns);
 * ```
 */
export function createW005Rule(
  concreteNouns?: readonly string[]
): W005GenericDescriptionRule {
  return new W005GenericDescriptionRule(concreteNouns);
}

export const W005GenericDescription = new W005GenericDescriptionRule();
