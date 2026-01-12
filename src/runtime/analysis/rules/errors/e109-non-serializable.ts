/**
 * E109: Non-Serializable Output
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
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Types that are not serializable in JSON.
 */
const NON_SERIALIZABLE_TYPES = Object.freeze(
  new Set(['function', 'undefined', 'symbol', 'bigint'])
);

/**
 * Check if a type is non-serializable.
 */
function isNonSerializableType(type: string): boolean {
  return NON_SERIALIZABLE_TYPES.has(type.toLowerCase());
}

class E109NonSerializableRule extends BaseRule {
  readonly id = ERROR_CODES.E109;
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

export const E109NonSerializable = new E109NonSerializableRule();
