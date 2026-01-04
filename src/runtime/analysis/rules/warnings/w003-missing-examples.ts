/**
 * W003: Missing Examples for User-Facing Inputs
 *
 * Condition:
 * - Tool takes user-provided input
 * - No examples provided
 *
 * Why:
 * - LLM guessing increases error rate
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if an input field appears to be user-provided.
 */
function isUserFacingInput(inputName: string, description?: string): boolean {
  const name = inputName.toLowerCase();
  const desc = (description || '').toLowerCase();

  // Keywords that suggest user input
  const userInputIndicators = [
    'user',
    'person',
    'name',
    'email',
    'location',
    'address',
    'preference',
    'query',
    'question',
    'input',
    'text',
    'message',
  ];

  // Split into tokens for whole-word matching
  const nameTokens = name
    .split(/[^\w]+|(?<=[a-z])(?=[A-Z])/)
    .filter(t => t.length > 0);
  const descTokens = desc
    .split(/[^\w]+|(?<=[a-z])(?=[A-Z])/)
    .filter(t => t.length > 0);
  const allTokens = new Set([...nameTokens, ...descTokens]);

  // Check for whole-word matches using word boundaries
  return userInputIndicators.some(indicator => {
    const indicatorRegex = new RegExp(`\\b${indicator}\\b`, 'i');
    return (
      allTokens.has(indicator) ||
      indicatorRegex.test(name) ||
      indicatorRegex.test(desc)
    );
  });
}

class W003MissingExamplesRule extends BaseRule {
  readonly id = 'W003';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Missing Examples for User-Facing Inputs';
  readonly description =
    'Tool accepts user-provided input but has no examples. LLM accuracy may be reduced.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        // Only check user-facing inputs
        if (!isUserFacingInput(input.name, input.description)) {
          continue;
        }

        // Check if it has an example (treat undefined, empty strings, whitespace-only, and empty arrays/objects as missing)
        const example = input.example;
        const isMissing =
          example === undefined ||
          (typeof example === 'string' && example.trim().length === 0) ||
          (Array.isArray(example) && example.length === 0) ||
          (typeof example === 'object' &&
            example !== null &&
            Object.keys(example).length === 0);

        if (isMissing) {
          diagnostics.push(
            this.createDiagnostic(
              `Tool "${tool.name}" parameter "${input.name}" has no examples. LLM accuracy may be reduced.`,
              tool.name,
              input.name,
              `Add example values to "${input.name}" to help the LLM understand the expected format.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const W003MissingExamples = new W003MissingExamplesRule();
