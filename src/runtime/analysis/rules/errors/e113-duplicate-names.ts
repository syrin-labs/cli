/**
 * E113: Duplicate Tool Names
 *
 * Condition:
 * - Multiple tools have identical names
 *
 * Why:
 * - Causes confusion for LLM tool selection
 * - Violates MCP specification uniqueness requirement
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class E113DuplicateNamesRule extends BaseRule {
  readonly id = 'E113';
  readonly severity = 'error' as const;
  readonly ruleName = 'Duplicate Tool Names';
  readonly description =
    'Multiple tools have identical names, causing confusion.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const nameCount = new Map<string, string[]>();

    // Count tool names
    for (const tool of ctx.tools) {
      const name = tool.name.toLowerCase();
      if (!nameCount.has(name)) {
        nameCount.set(name, []);
      }
      nameCount.get(name)!.push(tool.name);
    }

    // Find duplicates
    for (const [_lowerName, names] of nameCount) {
      if (names.length > 1) {
        diagnostics.push(
          this.createDiagnostic(
            `Duplicate tool names found: ${names.join(', ')}`,
            undefined,
            undefined,
            `Rename tools to have unique names.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const E113DuplicateNames = new E113DuplicateNamesRule();
