/**
 * Analysis output presentation.
 * Handles formatting of analysis results for CLI, JSON, and CI modes.
 */

import { log } from '@/utils/logger';
import { Messages } from '@/constants';
import type {
  AnalysisResult,
  Diagnostic,
  Dependency,
} from '@/runtime/analysis/types';

export interface AnalysisOutputOptions {
  ci?: boolean;
  json?: boolean;
  graph?: boolean;
}

/**
 * Format dependency graph as text.
 */
function formatDependencyGraph(dependencies: Dependency[]): string {
  if (dependencies.length === 0) {
    return 'No dependencies detected.';
  }

  const lines: string[] = [];
  lines.push(`\nDependency Graph (${dependencies.length} edges):`);
  lines.push('');

  // Group by confidence levels
  const highConf = dependencies.filter(d => d.confidence >= 0.8);
  const mediumConf = dependencies.filter(
    d => d.confidence >= 0.6 && d.confidence < 0.8
  );

  if (highConf.length > 0) {
    lines.push('High Confidence (≥0.8):');
    for (const dep of highConf) {
      lines.push(
        `  ${dep.fromTool}.${dep.fromField} → ${dep.toTool}.${dep.toField} (${dep.confidence.toFixed(2)})`
      );
    }
    lines.push('');
  }

  if (mediumConf.length > 0) {
    lines.push('Medium Confidence (0.6-0.8):');
    for (const dep of mediumConf) {
      lines.push(
        `  ${dep.fromTool}.${dep.fromField} → ${dep.toTool}.${dep.toField} (${dep.confidence.toFixed(2)})`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format diagnostic for CLI output.
 */
function formatDiagnostic(diagnostic: Diagnostic): string {
  const icon = diagnostic.severity === 'error' ? '❌' : '⚠️';
  const severity = diagnostic.severity === 'error' ? 'ERROR' : 'WARNING';

  let message = `${icon} ${severity}: ${diagnostic.message}`;

  if (diagnostic.tool) {
    message += `\n   Tool: ${diagnostic.tool}`;
  }

  if (diagnostic.field) {
    message += `\n   Field: ${diagnostic.field}`;
  }

  if (diagnostic.suggestion) {
    message += `\n\n   Suggestion:\n   ${diagnostic.suggestion}`;
  }

  return message;
}

/**
 * Display CLI output.
 */
export function displayCLIOutput(
  result: AnalysisResult,
  options: AnalysisOutputOptions
): void {
  // Verdict
  if (result.errors.length > 0) {
    log.error(
      Messages.ANALYSE_VERDICT_FAIL(
        result.errors.length,
        result.warnings.length
      )
    );
  } else if (result.warnings.length > 0) {
    log.warning(Messages.ANALYSE_VERDICT_PASS_WARNINGS(result.warnings.length));
  } else {
    log.success(Messages.ANALYSE_VERDICT_PASS);
  }

  log.blank();

  // Errors
  if (result.errors.length > 0) {
    log.plain(Messages.ANALYSE_ERRORS_HEADER);
    log.blank();
    for (const error of result.errors) {
      log.plain(formatDiagnostic(error));
      log.blank();
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    log.plain(Messages.ANALYSE_WARNINGS_HEADER);
    log.blank();
    for (const warning of result.warnings) {
      log.plain(formatDiagnostic(warning));
      log.blank();
    }
  }

  // Graph (if requested)
  if (options.graph) {
    log.plain(formatDependencyGraph(result.dependencies));
    log.blank();
  }

  // Summary
  log.plain(
    `Analyzed ${result.toolCount} tool${result.toolCount !== 1 ? 's' : ''}.`
  );
}

/**
 * Generate JSON output.
 */
interface JSONOutput {
  verdict: string;
  toolCount: number;
  errors: number;
  warnings: number;
  diagnostics: Array<{
    code: string;
    severity: string;
    message: string;
    tool?: string;
    field?: string;
    suggestion?: string;
    context?: Record<string, unknown>;
  }>;
  dependencies?: Array<{
    fromTool: string;
    fromField: string;
    toTool: string;
    toField: string;
    confidence: number;
  }>;
}

export function generateJSONOutput(
  result: AnalysisResult,
  options: AnalysisOutputOptions
): string {
  const output: JSONOutput = {
    verdict: result.verdict,
    toolCount: result.toolCount,
    errors: result.errors.length,
    warnings: result.warnings.length,
    diagnostics: result.diagnostics.map(d => ({
      code: d.code,
      severity: d.severity,
      message: d.message,
      tool: d.tool,
      field: d.field,
      suggestion: d.suggestion,
      context: d.context,
    })),
  };

  // Always include dependencies in JSON output (not just when --graph is set)
  output.dependencies = result.dependencies.map(d => ({
    fromTool: d.fromTool,
    fromField: d.fromField,
    toTool: d.toTool,
    toField: d.toField,
    confidence: d.confidence,
  }));

  return JSON.stringify(output, null, 2);
}

/**
 * Display CI output (minimal).
 */
export function displayCIOutput(
  result: AnalysisResult,
  options: AnalysisOutputOptions
): void {
  // CI mode: minimal output, exit codes handled by caller
  if (result.errors.length > 0) {
    console.log(
      `✗ Analysis failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`
    );
    // Print errors only (no warnings in CI)
    for (const error of result.errors) {
      console.log(`${error.code}: ${error.message}`);
    }
  } else {
    console.log(`✓ Analysis passed: ${result.toolCount} tool(s) analyzed`);
    if (result.warnings.length > 0) {
      console.log(`  ${result.warnings.length} warning(s) (non-blocking)`);
    }
  }

  // Show graph if requested
  if (options.graph) {
    console.log(formatDependencyGraph(result.dependencies));
  }
}

/**
 * Main entry point for displaying analysis results.
 */
export function displayAnalysisResult(
  result: AnalysisResult,
  options: AnalysisOutputOptions
): void {
  if (options.json) {
    console.log(generateJSONOutput(result, options));
    return;
  }

  if (options.ci) {
    displayCIOutput(result, options);
    return;
  }

  displayCLIOutput(result, options);
}
