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

import { BaseRule } from '@/runtime/analysis/rules/base';
import type { AnalysisContext, Diagnostic } from '@/runtime/analysis/types';

/**
 * Normalize and tokenize a tool name or description for comparison.
 */
function tokenize(text: string): string[] {
  let normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  normalized = normalized.replace(/[_\-\s]+/g, ' ');
  normalized = normalized.toLowerCase();
  normalized = normalized.replace(/[^\w\s]/g, '');
  return normalized.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Check if tool name tokens match description tokens.
 */
function hasTokenMatch(
  toolNameTokens: string[],
  descTokens: string[]
): boolean {
  if (toolNameTokens.length === 0) {
    return false;
  }

  // Multi-token subsequence match
  for (let i = 0; i <= descTokens.length - toolNameTokens.length; i++) {
    const subsequence = descTokens.slice(i, i + toolNameTokens.length);
    if (subsequence.join(' ') === toolNameTokens.join(' ')) {
      return true;
    }
  }

  // All tokens present (for multi-word tool names)
  if (toolNameTokens.length >= 2) {
    const descTokensSet = new Set(descTokens);
    if (toolNameTokens.every(token => descTokensSet.has(token))) {
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

    const implicitDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.6 && d.confidence < 0.8
    );

    for (const dep of implicitDeps) {
      const toTool = ctx.indexes.toolIndex.get(dep.toTool.toLowerCase());
      if (!toTool) {
        continue;
      }

      const description = toTool.description || '';
      const fromToolTokens = tokenize(dep.fromTool);
      const descTokens = tokenize(description);

      const hasMatch = hasTokenMatch(fromToolTokens, descTokens);

      if (!hasMatch) {
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
