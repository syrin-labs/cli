/**
 * Analysis orchestrator.
 * Main entry point for static analysis of MCP tools.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { loadMCPTools } from './loader';
import { normalizeTools } from './normalizer';
import { buildIndexes } from './indexer';
import { inferDependencies } from './dependencies';
import { ALL_RULES, filterRules } from './rules';
import { log } from '@/utils/logger';
import type {
  AnalysisContext,
  AnalysisResult,
  Diagnostic,
  Verdict,
} from './types';
import type { EventEmitter } from '@/events/emitter';
import { AnalysisEventType } from '@/events/event-type';
import type { LoadProgressCallback } from './loader';

/**
 * Analyze MCP tools and return diagnostics.
 * Executes all registered rules.
 *
 * @param tools - Normalized tool specifications
 * @param dependencies - Inferred dependencies
 * @param indexes - Built indexes
 * @param rules - Rules to run (defaults to ALL_RULES)
 * @returns Array of diagnostics
 */
function runRules(
  tools: AnalysisContext['tools'],
  dependencies: AnalysisContext['dependencies'],
  indexes: AnalysisContext['indexes'],
  rules: typeof ALL_RULES = ALL_RULES
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const context: AnalysisContext = {
    tools,
    dependencies,
    indexes,
  };

  // Run specified rules
  for (const rule of rules) {
    try {
      const ruleDiagnostics = rule.check(context);
      diagnostics.push(...ruleDiagnostics);
    } catch (error) {
      // If a rule fails, log error but don't crash the analysis
      log.error(
        `Rule ${rule.id} failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          ruleId: rule.id,
          ruleName: rule.ruleName,
        }
      );
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
 * @param eventEmitter - Optional event emitter for analysis events
 * @param options - Analysis options
 * @returns Analysis result
 */
export async function analyseTools(
  client: Client,
  eventEmitter?: EventEmitter,
  options?: {
    /** Timeout for the entire analysis in milliseconds (default: 60000) */
    timeoutMs?: number;
    /** Rule IDs to filter: prefix with - to exclude (e.g., ['E100', '-W101']) */
    ruleFilter?: string[];
    /** Progress callback for UI updates */
    onProgress?: LoadProgressCallback;
  }
): Promise<AnalysisResult> {
  const timeoutMs = options?.timeoutMs ?? 60000;
  const ruleFilter = options?.ruleFilter;
  const onProgress = options?.onProgress;

  // Filter rules if specified
  const rulesToRun = ruleFilter ? filterRules(ruleFilter) : ALL_RULES;

  const startTime = Date.now();

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Analysis timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Step 1: Load raw tools
  const rawTools = await Promise.race([
    loadMCPTools(client, onProgress),
    timeoutPromise,
  ]);

  // Initialize concept embeddings for semantic rule checking
  const { initializeConceptEmbeddings } = await import('./semantic-embedding');
  await initializeConceptEmbeddings();

  // Emit ANALYSIS_STARTED event
  if (eventEmitter) {
    await eventEmitter.emit(AnalysisEventType.ANALYSIS_STARTED, {
      timestamp: new Date().toISOString(),
      toolCount: rawTools.length,
    });
  }

  // Check remaining time
  const elapsed = Date.now() - startTime;
  const remainingTime = timeoutMs - elapsed;
  if (remainingTime <= 0) {
    throw new Error(
      `Analysis timed out after ${elapsed}ms during tool loading`
    );
  }

  // Create new timeout for remaining steps
  const remainingTimeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Analysis timed out after ${timeoutMs}ms`));
    }, remainingTime);
  });

  // Step 2: Normalize tools
  const tools = await Promise.race([
    normalizeTools(rawTools),
    remainingTimeoutPromise,
  ]);

  // Step 3: Build indexes
  const indexes = buildIndexes(tools);

  // Step 4: Infer dependencies
  const dependencies = inferDependencies(tools);

  // Step 5: Run rules
  const diagnostics = runRules(tools, dependencies, indexes, rulesToRun);

  // Step 6: Compute verdict
  const verdict = computeVerdict(diagnostics);

  // Separate errors and warnings
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  const durationMs = Date.now() - startTime;

  // Emit ANALYSIS_COMPLETED event
  if (eventEmitter) {
    await eventEmitter.emit(AnalysisEventType.ANALYSIS_COMPLETED, {
      verdict,
      toolCount: tools.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      durationMs,
    });
  }

  return {
    verdict,
    diagnostics,
    errors,
    warnings,
    dependencies,
    toolCount: tools.length,
  };
}
