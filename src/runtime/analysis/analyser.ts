/**
 * Analysis orchestrator.
 * Main entry point for static analysis of MCP tools.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { loadMCPTools } from './loader';
import { normalizeTools } from './normalizer';
import { buildIndexes } from './indexer';
import { inferDependencies } from './dependencies';
import { ALL_RULES } from './rules';
import type {
  AnalysisContext,
  AnalysisResult,
  Diagnostic,
  Verdict,
} from './types';

/**
 * Analyze MCP tools and return diagnostics.
 * Executes all registered rules.
 *
 * @param tools - Normalized tool specifications
 * @param dependencies - Inferred dependencies
 * @param indexes - Built indexes
 * @returns Array of diagnostics
 */
function runRules(
  tools: AnalysisContext['tools'],
  dependencies: AnalysisContext['dependencies'],
  indexes: AnalysisContext['indexes']
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const context: AnalysisContext = {
    tools,
    dependencies,
    indexes,
  };

  // Run all registered rules
  for (const rule of ALL_RULES) {
    try {
      const ruleDiagnostics = rule.check(context);
      diagnostics.push(...ruleDiagnostics);
    } catch (error) {
      // If a rule fails, log error but don't crash the analysis
      console.error(`Rule ${rule.id} failed:`, error);
    }
  }

  return diagnostics;
}

/**
 * Compute verdict from diagnostics.
 */
function computeVerdict(diagnostics: Diagnostic[]): Verdict {
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  if (errors.length > 0) {
    return 'fail';
  }

  if (warnings.length > 0) {
    return 'pass-with-warnings';
  }

  return 'pass';
}

/**
 * Perform static analysis on MCP tools.
 *
 * @param client - Connected MCP client
 * @returns Analysis result
 */
export async function analyseTools(client: Client): Promise<AnalysisResult> {
  // Step 1: Load raw tools
  const rawTools = await loadMCPTools(client);

  // Step 2: Normalize tools
  const tools = await normalizeTools(rawTools);

  // Step 3: Build indexes
  const indexes = buildIndexes(tools);

  // Step 4: Infer dependencies
  const dependencies = inferDependencies(tools, indexes);

  // Step 5: Run rules
  const diagnostics = runRules(tools, dependencies, indexes);

  // Step 6: Compute verdict
  const verdict = computeVerdict(diagnostics);

  // Separate errors and warnings
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  return {
    verdict,
    diagnostics,
    errors,
    warnings,
    dependencies,
    toolCount: tools.length,
  };
}
