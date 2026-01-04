/**
 * W001: Implicit Tool Dependency
 *
 * Condition:
 * - High confidence dependency inferred
 * - Not stated explicitly in description
 *
 * Why:
 * - LLM may not chain tools reliably
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

class W001ImplicitDependencyRule extends BaseRule {
  readonly id = 'W001';
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

      // Check if fromTool is mentioned in description
      const fromToolNameLower = dep.fromTool.toLowerCase();
      const descLower = description.toLowerCase();

      if (!descLower.includes(fromToolNameLower)) {
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

export const W001ImplicitDependency = new W001ImplicitDependencyRule();
