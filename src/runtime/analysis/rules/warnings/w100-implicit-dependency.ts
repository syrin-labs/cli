/**
 * W100: Implicit Tool Dependency
 *
 * Condition:
 * - Medium confidence dependency inferred (0.6–0.8)
 * - Not stated explicitly in description
 *
 * Why:
 * - LLM may not chain tools reliably
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Normalize and tokenize a tool name or description for comparison.
 * - Expand camelCase to space-separated words
 * - Replace underscores/dashes with spaces
 * - Lowercase
 * - Remove non-alphanumeric chars
 * - Split into tokens
 */
function tokenize(text: string): string[] {
  // Expand camelCase to space-separated words (must do before lowercasing)
  let normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace underscores and dashes with spaces
  normalized = normalized.replace(/[_\-\s]+/g, ' ');

  // Lowercase
  normalized = normalized.toLowerCase();

  // Remove non-alphanumeric chars (keep only alphanumeric and spaces)
  normalized = normalized.replace(/[^\w\s]/g, '');

  // Split into tokens and filter empty strings
  return normalized.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Check if tool name tokens match description tokens.
 * Returns true if there's a complete multi-token subsequence match (all tokens in order)
 * or if all tool name tokens appear in description (allowing for order).
 * This reduces false positives from common words like "get" or "user".
 */
function hasTokenMatch(
  toolNameTokens: string[],
  descTokens: string[]
): boolean {
  // Early return for empty tokens
  if (toolNameTokens.length === 0) {
    return false;
  }

  // Check for complete multi-token subsequence match (all tokens in order)
  for (let i = 0; i <= descTokens.length - toolNameTokens.length; i++) {
    const subsequence = descTokens.slice(i, i + toolNameTokens.length);
    if (subsequence.join(' ') === toolNameTokens.join(' ')) {
      return true;
    }
  }

  // Check if all tool name tokens appear in description (allowing for order)
  // This catches cases like "get_user_id" matching "uses get_user_id internally"
  if (toolNameTokens.length >= 2) {
    const descTokensSet = new Set(descTokens);
    const allTokensPresent = toolNameTokens.every(token =>
      descTokensSet.has(token)
    );
    if (allTokensPresent) {
      return true;
    }
  }

  return false;
}

class W100ImplicitDependencyRule extends BaseRule {
  readonly id = 'W100';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Implicit Tool Dependency';
  readonly description =
    'Tool appears to depend on another tool, but the dependency is implicit.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check medium to high confidence dependencies (0.6-0.8)
    const implicitDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.6 && d.confidence < 0.8
    );

    for (const dep of implicitDeps) {
      // Find the toTool to check its description
      const toTool = ctx.indexes.toolIndex.get(dep.toTool.toLowerCase());

      if (!toTool) {
        continue;
      }

      const description = toTool.description || '';

      // Tokenize both tool name and description for accurate comparison
      const fromToolTokens = tokenize(dep.fromTool);
      const descTokens = tokenize(description);

      // Check if fromTool tokens match description tokens
      if (!hasTokenMatch(fromToolTokens, descTokens)) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${dep.toTool}" appears to depend on "${dep.fromTool}", but the dependency is implicit.`,
            dep.toTool,
            dep.toField,
            `Mention "${dep.fromTool}" in the description of "${dep.toTool}" to make the dependency explicit.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W100ImplicitDependency = new W100ImplicitDependencyRule();
