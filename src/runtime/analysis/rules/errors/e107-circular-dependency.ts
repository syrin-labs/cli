/**
 * E107: Circular Tool Dependency
 *
 * Condition:
 * - Tool dependency graph contains a cycle
 *
 * Why:
 * - LLMs cannot reason about cycles
 * - Execution becomes undefined
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic, Dependency } from '../../types';

/**
 * Detect cycles in the dependency graph using DFS.
 */
function detectCycles(dependencies: Dependency[]): string[][] {
  // Build adjacency list
  const graph = new Map<string, string[]>();

  for (const dep of dependencies) {
    if (!graph.has(dep.fromTool)) {
      graph.set(dep.fromTool, []);
    }
    graph.get(dep.fromTool)!.push(dep.toTool);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(tool: string, path: string[]): void {
    visited.add(tool);
    recStack.add(tool);
    path.push(tool);

    const neighbors = graph.get(tool) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    recStack.delete(tool);
  }

  // Check all tools
  for (const dep of dependencies) {
    if (!visited.has(dep.fromTool)) {
      dfs(dep.fromTool, []);
    }
  }

  return cycles;
}

class E107CircularDependencyRule extends BaseRule {
  readonly id = ERROR_CODES.E107;
  readonly severity = 'error' as const;
  readonly ruleName = 'Circular Tool Dependency';
  readonly description =
    'Circular dependency detected between tools. Execution becomes undefined.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Only check high-confidence dependencies (>= 0.65) for cycles
    // Real-world scoring maxes out ~0.73, so lowered from 0.8 to enable rule
    const highConfidenceDeps = ctx.dependencies.filter(
      d => d.confidence >= 0.65
    );

    if (highConfidenceDeps.length === 0) {
      return diagnostics;
    }

    const cycles = detectCycles(highConfidenceDeps);

    // Report each cycle
    const reportedCycles = new Set<string>();

    for (const cycle of cycles) {
      // Create a canonical representation of the cycle (sort a copy to avoid mutating original)
      const cycleKey = [...cycle].sort().join(' → ');

      if (reportedCycles.has(cycleKey)) {
        continue;
      }
      reportedCycles.add(cycleKey);

      const cycleStr = cycle.join(' → ');

      diagnostics.push(
        this.createDiagnostic(
          `Circular dependency detected between tools: ${cycleStr}.`,
          undefined,
          undefined,
          `Break the cycle by removing or restructuring dependencies between: ${cycle.join(', ')}.`
        )
      );
    }

    return diagnostics;
  }
}

export const E107CircularDependency = new E107CircularDependencyRule();
