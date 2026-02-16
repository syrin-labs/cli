/**
 * W113: Optional Parameter Should Have Default
 *
 * Condition:
 * - Optional parameter lacks an example value
 *
 * Why:
 * - Without example, LLM may pass undefined causing errors
 * - Example values improve tool reliability and understanding
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class W113OptionalDefaultsRule extends BaseRule {
  readonly id = 'W113';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Optional Parameter Example';
  readonly description =
    'Optional parameters should have example values for reliable LLM tool calling.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const field of tool.inputs) {
        // Only check optional fields without examples
        if (!field.required && field.example === undefined) {
          // Check if field has no enum (enums implicitly define possible values)
          if (!field.enum) {
            diagnostics.push(
              this.createDiagnostic(
                `Optional parameter "${field.name}" in "${tool.name}" lacks example value.`,
                tool.name,
                field.name,
                `Add an example value to ensure reliable LLM tool calling.`
              )
            );
          }
        }
      }
    }

    return diagnostics;
  }
}

export const W113OptionalDefaults = new W113OptionalDefaultsRule();
