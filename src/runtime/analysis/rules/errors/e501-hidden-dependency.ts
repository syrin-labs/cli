/**
 * E501: Hidden Dependency
 *
 * Condition: Tool calls other tools during execution without declaring them in contract
 *
 * Why this is fatal:
 * - Breaks isolation assumption
 * - Creates hidden coupling
 * - Makes tool behavior unpredictable
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for hidden dependency detection.
 */
export interface HiddenDependencyContext {
  /** Tool name */
  toolName: string;
  /** List of tool calls that are not declared */
  hiddenDependencies: Array<{
    toolName: string;
    timestamp: number;
  }>;
  /** List of declared dependencies that don't exist in the MCP server */
  missingDependencies?: string[];
  /**
   * Declared dependencies from contract.
   * @todo Reserved for future validation/consumer use.
   * Currently unused by checkWithBehavioralContext() but retained for potential
   * future enhancements such as dependency validation or consumer tool analysis.
   */
  declaredDependencies: string[];
}

class E501HiddenDependencyRule extends BaseRule {
  readonly id = ERROR_CODES.E501;
  readonly severity = 'error' as const;
  readonly ruleName = 'Hidden Dependency';
  readonly description =
    'Tool calls other tools during execution without declaring them in contract. This breaks isolation.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(
    behavioralCtx: HiddenDependencyContext
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for hidden dependencies (tools called but not declared)
    if (behavioralCtx.hiddenDependencies.length > 0) {
      const dependencyList = behavioralCtx.hiddenDependencies
        .map(dep => `  - ${dep.toolName}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" called other tools without declaring them:\n${dependencyList}`,
          behavioralCtx.toolName,
          undefined,
          `Declare dependencies in contract (guarantees.dependencies: [${behavioralCtx.hiddenDependencies.map(d => `"${d.toolName}"`).join(', ')}]) or remove the tool calls.`
        )
      );
    }

    // Check for missing dependencies (declared but don't exist in MCP server)
    if (
      behavioralCtx.missingDependencies &&
      behavioralCtx.missingDependencies.length > 0
    ) {
      const missingList = behavioralCtx.missingDependencies
        .map(dep => `  - ${dep}`)
        .join('\n');

      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" declares dependencies that don't exist in the MCP server:\n${missingList}`,
          behavioralCtx.toolName,
          undefined,
          `Remove non-existent dependencies from contract (guarantees.dependencies) or ensure these tools are implemented: [${behavioralCtx.missingDependencies.map(d => `"${d}"`).join(', ')}]`
        )
      );
    }

    return diagnostics;
  }
}

export const E501HiddenDependency = new E501HiddenDependencyRule();
