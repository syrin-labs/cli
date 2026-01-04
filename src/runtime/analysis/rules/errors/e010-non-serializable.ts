/**
 * E010: Non-Serializable Output
 *
 * Condition:
 * - Output schema contains:
 *   - functions
 *   - class instances
 *   - unsupported types
 *
 * Why:
 * - Breaks MCP contract
 * - Breaks recording & replay later
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Check if a type is non-serializable.
 */
function isNonSerializableType(type: string): boolean {
  const nonSerializableTypes = new Set([
    'function',
    'undefined',
    'symbol',
    'bigint',
  ]);

  return nonSerializableTypes.has(type.toLowerCase());
}

class E010NonSerializableRule extends BaseRule {
  readonly id = 'E010';
  readonly severity = 'error' as const;
  readonly ruleName = 'Non-Serializable Output';
  readonly description =
    'Output of tool is not serializable. Breaks MCP contract.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const output of tool.outputs) {
        if (isNonSerializableType(output.type)) {
          diagnostics.push(
            this.createDiagnostic(
              `Output of "${tool.name}" (field: "${output.name}") has non-serializable type "${output.type}".`,
              tool.name,
              output.name,
              `Change the output type to a serializable type (string, number, boolean, object, array).`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E010NonSerializable = new E010NonSerializableRule();
