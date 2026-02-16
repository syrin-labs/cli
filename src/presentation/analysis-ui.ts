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
  sarif?: boolean;
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
    highConf.forEach((dep, i) => {
      lines.push(
        `  ${i + 1}. ${dep.fromTool}.${dep.fromField} → ${dep.toTool}.${dep.toField} (${dep.confidence.toFixed(2)})`
      );
    });
    lines.push('');
  }

  if (mediumConf.length > 0) {
    lines.push('Medium Confidence (0.6-0.8):');
    mediumConf.forEach((dep, i) => {
      lines.push(
        `  ${i + 1}. ${dep.fromTool}.${dep.fromField} → ${dep.toTool}.${dep.toField} (${dep.confidence.toFixed(2)})`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format diagnostic for CLI output.
 * @param diagnostic - The diagnostic to format
 * @param index - Optional 1-based index for numbering (e.g. "1. ERROR: ...")
 */
function formatDiagnostic(diagnostic: Diagnostic, index?: number): string {
  const icon = diagnostic.severity === 'error' ? '❌' : '⚠️';
  const severity = diagnostic.severity === 'error' ? 'ERROR' : 'WARNING';
  const prefix = index !== undefined ? `${index}. ` : '';

  let message = `${prefix}${icon} ${severity}: ${diagnostic.message}`;

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
    result.errors.forEach((error, i) => {
      log.plain(formatDiagnostic(error, i + 1));
      log.blank();
    });
  }

  // Warnings
  if (result.warnings.length > 0) {
    log.plain(Messages.ANALYSE_WARNINGS_HEADER);
    log.blank();
    result.warnings.forEach((warning, i) => {
      log.plain(formatDiagnostic(warning, i + 1));
      log.blank();
    });
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
  _options: AnalysisOutputOptions
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
    log.error(
      `Analysis failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`
    );
    // Print errors only (no warnings in CI), numbered
    result.errors.forEach((error, i) => {
      log.plain(`${i + 1}. ${error.code}: ${error.message}`);
    });
  } else {
    log.success(`Analysis passed: ${result.toolCount} tool(s) analyzed`);
    if (result.warnings.length > 0) {
      log.warning(`  ${result.warnings.length} warning(s) (non-blocking)`);
    }
  }

  // Show graph if requested
  if (options.graph) {
    log.plain(formatDependencyGraph(result.dependencies));
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
    log.plain(generateJSONOutput(result, options));
    return;
  }

  if (options.sarif) {
    log.plain(generateSARIFOutput(result));
    return;
  }

  if (options.ci) {
    displayCIOutput(result, options);
    return;
  }

  displayCLIOutput(result, options);
}

/**
 * Generate SARIF (Static Analysis Results Interchange Format) output.
 * SARIF is a JSON-based format for sharing static analysis results.
 * Used by GitHub Advanced Security and other CI tools.
 */
function generateSARIFOutput(result: AnalysisResult): string {
  const sarif = {
    version: '2.1.0',
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'Syrin',
            version: '1.6.0',
            informationUri: 'https://github.com/syrin-labs/syrin',
            rules: result.diagnostics.map(d => ({
              id: d.code,
              name: d.code,
              shortDescription: {
                text: d.message.substring(0, 200),
              },
              helpUri: `https://docs.syrin.dev/rules/${d.code}`,
            })),
          },
        },
        results: result.diagnostics.map(d => ({
          ruleId: d.code,
          level: d.severity === 'error' ? 'error' : 'warning',
          message: {
            text: d.message,
          },
          locations: d.tool
            ? [
                {
                  physicalLocation: {
                    artifactLocation: {
                      uri: `tool://${d.tool}`,
                    },
                    region: d.field
                      ? {
                          message: {
                            text: `Parameter: ${d.field}`,
                          },
                        }
                      : undefined,
                  },
                },
              ]
            : [],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
