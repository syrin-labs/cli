/**
 * W104: Tool Description Too Generic
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

import { BaseRule } from '@/runtime/analysis/rules/base';
import type { AnalysisContext, Diagnostic } from '@/runtime/analysis/types';

/**
 * Extended list of concrete nouns that make a description specific.
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
  'inventory',
  'schedule',
  'event',
  'task',
  'document',
  'report',
  'invoice',
] as const;

/**
 * Check if description is too generic.
 */
function isGenericDescription(
  description: string,
  concreteNouns: readonly string[] = DEFAULT_CONCRETE_NOUNS
): boolean {
  const descLower = description.toLowerCase();

  const vagueVerbs = ['get', 'handle', 'process', 'do', 'make', 'use', 'call'];
  const hasVagueVerb = vagueVerbs.some(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(descLower);
  });

  if (!hasVagueVerb) {
    return false;
  }

  const hasConcreteNoun = concreteNouns.some(noun =>
    descLower.includes(noun.toLowerCase())
  );

  return !hasConcreteNoun;
}

class W104GenericDescriptionRule extends BaseRule {
  readonly id = 'W104';
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
 * Create a W104 rule instance with custom concrete nouns.
 *
 * @param concreteNouns - Optional list of concrete nouns (defaults to DEFAULT_CONCRETE_NOUNS)
 * @returns A new W104GenericDescriptionRule instance
 *
 * @example
 * ```ts
 * import { createW104Rule, DEFAULT_CONCRETE_NOUNS } from './w005-generic-description';
 * const customNouns = [...DEFAULT_CONCRETE_NOUNS, 'invoice', 'report'];
 * const customRule = createW104Rule(customNouns);
 * ```
 */
export function createW104Rule(
  concreteNouns?: readonly string[]
): W104GenericDescriptionRule {
  return new W104GenericDescriptionRule(concreteNouns);
}

export const W104GenericDescription = new W104GenericDescriptionRule();
