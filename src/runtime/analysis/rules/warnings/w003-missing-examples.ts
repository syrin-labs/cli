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

  const combined = `${name} ${desc}`;

  return userInputIndicators.some(indicator => combined.includes(indicator));
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

        // Check if it has an example
        if (input.example === undefined) {
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
