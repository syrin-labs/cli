/**
 * E009: Tool Depends on User Input Indirectly
 *
 * Condition:
 * - Tool expects data
 * - Only source is implicit user memory / conversation
 * - No explicit tool provides it
 *
 * Why:
 * - Relies on hallucinated context
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E009ImplicitUserInputRule extends BaseRule {
  readonly id = 'E009';
  readonly severity = 'error' as const;
  readonly ruleName = 'Tool Depends on User Input Indirectly';
  readonly description =
    'Tool depends on implicit user context with no explicit source.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        if (!input.required) {
          continue;
        }

        // Check if there's any tool that provides this input
        // Look for output fields with similar names
        const fieldName = input.name.toLowerCase();
        let hasExplicitSource = false;

        for (const otherTool of ctx.tools) {
          if (otherTool.name === tool.name) {
            continue;
          }

          for (const output of otherTool.outputs) {
            const outputName = output.name.toLowerCase();

            // Check for name similarity
            if (
              outputName === fieldName ||
              outputName.includes(fieldName) ||
              fieldName.includes(outputName)
            ) {
              hasExplicitSource = true;
              break;
            }
          }

          if (hasExplicitSource) {
            break;
          }
        }

        // Also check dependencies
        if (!hasExplicitSource) {
          const hasDependency = ctx.dependencies.some(
            d =>
              d.toTool === tool.name &&
              d.toField === input.name &&
              d.confidence >= 0.6
          );

          if (hasDependency) {
            hasExplicitSource = true;
          }
        }

        // If no explicit source found and input name suggests user data
        const userDataIndicators = [
          'user',
          'person',
          'name',
          'email',
          'location',
          'address',
          'preference',
        ];

        const looksLikeUserData = userDataIndicators.some(indicator =>
          fieldName.includes(indicator)
        );

        if (!hasExplicitSource && looksLikeUserData) {
          diagnostics.push(
            this.createDiagnostic(
              `Tool "${tool.name}" depends on implicit user context (parameter: "${input.name}") with no explicit source.`,
              tool.name,
              input.name,
              `Create an explicit tool to provide "${input.name}", or ensure it's clearly documented as user input.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E009ImplicitUserInput = new E009ImplicitUserInputRule();
