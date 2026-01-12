/**
 * Test Results UI for MCP Connection Testing and Tool Validation.
 * Provides a minimalistic, easy-to-read display of connection test results
 * and tool validation results.
 */

import type { MCPConnectionResult } from '@/runtime/mcp/types';
import type { TransportType } from '@/config/types';
import type { TestOrchestratorResult } from '@/runtime/test/orchestrator';
import { getVersionDisplayString } from '@/utils/version-display';
import { log } from '@/utils/logger';

/**
 * Context information for tool errors.
 */
export interface ToolErrorContext {
  testName?: string;
  testInput?: Record<string, unknown>;
  expectedOutputSchema?: string;
  parsedError?: {
    field?: string;
    message?: string;
    inputValue?: string;
    inputType?: string;
    errorType?: string;
  };
}

export interface TestResultsUIOptions {
  /** Connection test result to display */
  result: MCPConnectionResult;
  /** Transport type being tested */
  transport: TransportType;
  /** Whether to show verbose details (HTTP request/response) */
  verbose?: boolean;
}

/**
 * Get human-readable explanation for capability properties.
 */
function explainCapabilityProperty(
  capabilityName: string,
  propertyName: string
): string {
  const explanations: Record<string, Record<string, string>> = {
    tools: {
      listChanged:
        'Server sends notifications when the list of available tools changes',
    },
    prompts: {
      listChanged:
        'Server sends notifications when the list of available prompts changes',
    },
    resources: {
      listChanged:
        'Server sends notifications when the list of available resources changes',
      subscribe: 'Server supports subscribing to resource updates',
    },
    tasks: {
      list: 'Server supports listing tasks',
      cancel: 'Server supports cancelling tasks',
      'requests.tools.call':
        'Server supports task-augmented tool calls (long-running operations)',
    },
    completions: {
      '*': 'Server supports LLM completion requests',
    },
    logging: {
      '*': 'Server supports logging messages',
    },
    experimental: {
      '*': 'Server supports experimental features',
    },
  };

  return (
    explanations[capabilityName]?.[propertyName] ||
    explanations[capabilityName]?.['*'] ||
    ''
  );
}

/**
 * Display test results using plain console output.
 * This avoids Ink taking control of stdin, which disables terminal history.
 */
export async function displayTestResults(
  options: TestResultsUIOptions
): Promise<void> {
  const { result, transport } = options;

  // Get version info for display
  const versionDisplayString = await getVersionDisplayString();

  const details = result.details;
  const success = result.success;

  // Version display
  log.blank();
  log.label(`Syrin ${versionDisplayString}`);
  log.blank();

  // Header
  if (success) {
    log.checkmark('Connection successful');
  } else {
    log.xmark('Connection failed');
  }

  // Error message if failed
  if (result.error) {
    log.error(`  Error: ${result.error}`);
  }

  // Connection details
  if (details) {
    log.blank();
    log.heading('  Connection Details:');
    if (transport === 'http' && details.mcpUrl) {
      const status = success ? ` ${log.tick()}` : '';
      log.labelValue('    MCP URL:', `${details.mcpUrl}${status}`);
    } else if (transport === 'stdio' && details.command) {
      const status = success ? ` ${log.tick()}` : '';
      log.labelValue('    Command:', `${details.command}${status}`);
    }
    if (details.protocolVersion) {
      log.labelValue('    Protocol Version:', details.protocolVersion);
    }
    if (details.sessionId) {
      log.labelValue('    Session ID:', details.sessionId);
    }
  }

  // Initialize Handshake details (only for HTTP transport and successful connections)
  if (details?.initializeRequest && success && transport === 'http') {
    log.blank();
    log.heading('  Initialize Handshake:');
    log.label(
      '    Note: MCP uses Server-Sent Events (SSE) transport. Messages are sent via HTTP POST'
    );
    log.label(
      '    and responses are received via HTTP GET with text/event-stream.'
    );
    log.blank();

    // Request details
    log.plain(`    ${log.styleText('Request:', 'bold')}`);
    if (details.initializeRequest.method) {
      log.labelValue('      HTTP Method:', details.initializeRequest.method);
    }
    if (details.initializeRequest.url) {
      log.labelValue('      URL:', details.initializeRequest.url);
    }
    if (
      details.initializeRequest.headers &&
      Object.keys(details.initializeRequest.headers).length > 0
    ) {
      log.label('      Headers:');
      for (const [key, val] of Object.entries(
        details.initializeRequest.headers
      )) {
        log.labelValue(`        ${key}:`, String(val));
      }
    }
    if (details.initializeRequest.body) {
      const body = details.initializeRequest.body as {
        method?: string;
        params?: {
          clientInfo?: { name?: string; version?: string };
          protocolVersion?: string;
        };
      };
      if (body.method) {
        log.labelValue('      JSON-RPC Method:', body.method);
      }
      if (body.params?.protocolVersion) {
        log.labelValue('      Protocol Version:', body.params.protocolVersion);
      }
      if (body.params?.clientInfo) {
        log.labelValue(
          '      Client Info:',
          `${body.params.clientInfo.name || ''} v${body.params.clientInfo.version || ''}`
        );
      }
    }

    // Response details
    if (details.initializeResponse) {
      log.blank();
      log.plain(`    ${log.styleText('Response:', 'bold')}`);
      if (details.initializeResponse.statusCode) {
        log.labelValue(
          '      Status:',
          String(details.initializeResponse.statusCode)
        );
      }
      if (
        details.initializeResponse.headers &&
        Object.keys(details.initializeResponse.headers).length > 0
      ) {
        log.label('      Response Headers:');
        for (const [key, val] of Object.entries(
          details.initializeResponse.headers
        )) {
          log.labelValue(`        ${key}:`, String(val));
        }
      }
      log.label(
        '      Note: Server capabilities are returned in the initialize response'
      );
    }
  }

  // Capabilities
  const getValidCapabilityKeys = (
    caps: Record<string, unknown> | undefined
  ): string[] => {
    if (!caps) return [];
    return Object.keys(caps).filter(key => {
      const val = caps[key];
      return val !== undefined && val !== null && val !== false;
    });
  };

  const validCapabilityKeys = getValidCapabilityKeys(details?.capabilities);
  if (details?.capabilities && validCapabilityKeys.length > 0) {
    const capabilityCount = validCapabilityKeys.length;
    log.blank();
    log.heading(`  Server Capabilities (${capabilityCount}):`);
    log.label(
      '    Note: Capabilities are obtained from the initialize response'
    );

    const capabilities = details.capabilities;
    const capabilityNames = validCapabilityKeys;

    for (const capabilityName of capabilityNames) {
      const capability = capabilities[capabilityName];

      if (
        capability &&
        typeof capability === 'object' &&
        !Array.isArray(capability)
      ) {
        const capabilityObj = capability as Record<string, unknown>;
        const props = Object.keys(capabilityObj).filter(
          prop =>
            capabilityObj[prop] !== undefined &&
            capabilityObj[prop] !== null &&
            capabilityObj[prop] !== false
        );

        if (props.length > 0) {
          log.plain(`  ${log.styleText(capabilityName + ':', 'bold', 'cyan')}`);
          for (const prop of props) {
            const explanation = explainCapabilityProperty(capabilityName, prop);
            if (explanation) {
              log.plain(
                `    ${log.styleText('•', 'dim')} ${log.styleText(prop, 'cyan')} ${log.styleText(`- ${explanation}`, 'dim')}`
              );
            } else {
              log.plain(
                `    ${log.styleText('•', 'dim')} ${log.styleText(prop, 'cyan')}`
              );
            }
          }
        } else {
          log.plain(
            `  ${log.styleText('•', 'dim')} ${log.styleText(capabilityName, 'cyan')}`
          );
        }
      } else {
        const explanation = explainCapabilityProperty(capabilityName, '*');
        if (explanation) {
          log.plain(
            `  ${log.styleText('•', 'dim')} ${log.styleText(capabilityName, 'cyan')} ${log.styleText(`- ${explanation}`, 'dim')}`
          );
        } else {
          log.plain(
            `  ${log.styleText('•', 'dim')} ${log.styleText(capabilityName, 'cyan')}`
          );
        }
      }
    }
  }
  log.blank();
}

/**
 * Format test results for CI output (minimal).
 */
export function formatCIResults(result: TestOrchestratorResult): void {
  const errors = result.diagnostics.filter(d => d.severity === 'error');
  const warnings = result.diagnostics.filter(d => d.severity === 'warning');

  // CI mode: minimal output, exit codes handled by caller
  if (result.verdict === 'fail') {
    console.log(
      `✗ Test failed: ${result.toolsFailed} tool(s) failed, ${errors.length} error(s), ${warnings.length} warning(s)`
    );
    // Print errors only (no warnings in CI)
    for (const error of errors) {
      console.log(`${error.code}: ${error.message}`);
    }
  } else {
    console.log(
      `✓ Test passed: ${result.toolsTested} tool(s) tested, ${result.toolsPassed} passed`
    );
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) (non-blocking)`);
    }
  }
}

/**
 * Format test results for CLI output.
 */
export function formatCLIResults(result: TestOrchestratorResult): void {
  log.blank();
  log.heading('Tool Validation Results');
  log.blank();

  // Overall verdict
  if (result.verdict === 'pass') {
    log.checkmark('All tools passed validation');
  } else if (result.verdict === 'pass-with-warnings') {
    log.warn('Tools passed with warnings');
  } else {
    log.xmark('Tool validation failed');
  }

  log.blank();

  // Summary
  log.heading('Summary:');
  log.labelValue('  Tools tested:', String(result.toolsTested));
  log.labelValue('  Tools passed:', String(result.toolsPassed));
  log.labelValue('  Tools failed:', String(result.toolsFailed));

  const errors = result.diagnostics.filter(d => d.severity === 'error');
  const warnings = result.diagnostics.filter(d => d.severity === 'warning');

  if (errors.length > 0) {
    log.labelValue('  Errors:', String(errors.length));
  }
  if (warnings.length > 0) {
    log.labelValue('  Warnings:', String(warnings.length));
  }

  log.blank();

  // Tool results
  if (result.toolResults.length > 0) {
    log.heading('Tool Results:');
    for (const toolResult of result.toolResults) {
      log.blank();
      const status = toolResult.passed ? log.tick() : log.cross();
      log.plain(`  ${status} ${log.styleText(toolResult.toolName, 'bold')}`);

      // Summary
      log.labelValue(
        '    Executions:',
        `${toolResult.summary.successfulExecutions}/${toolResult.summary.totalExecutions} successful`
      );
      if (
        toolResult.summary.testsPassed !== undefined &&
        toolResult.summary.testsFailed !== undefined
      ) {
        const totalTests =
          toolResult.summary.testsPassed + toolResult.summary.testsFailed;
        log.labelValue(
          '    Tests:',
          `${toolResult.summary.testsPassed}/${totalTests} passed (expectations matched)`
        );
      }
      if (toolResult.summary.failedExecutions > 0) {
        log.labelValue(
          '    Failed:',
          String(toolResult.summary.failedExecutions)
        );
      }
      if (toolResult.summary.timedOutExecutions > 0) {
        log.labelValue(
          '    Timed out:',
          String(toolResult.summary.timedOutExecutions)
        );
      }

      // Diagnostics
      if (toolResult.diagnostics.length > 0) {
        const toolErrors = toolResult.diagnostics.filter(
          d => d.severity === 'error'
        );
        const toolWarnings = toolResult.diagnostics.filter(
          d => d.severity === 'warning'
        );

        if (toolErrors.length > 0) {
          log.plain('    Errors:');
          for (const error of toolErrors) {
            log.error(`      ${error.code}: ${error.message}`);

            // Show test context if available
            const context = error.context as ToolErrorContext | undefined;

            if (context?.testName) {
              log.plain(`        Test: ${context.testName}`);
            }

            if (
              context?.testInput &&
              Object.keys(context.testInput).length > 0
            ) {
              const inputStr = JSON.stringify(context.testInput, null, 2)
                .split('\n')
                .map((line, idx) => (idx === 0 ? line : `        ${line}`))
                .join('\n');
              log.plain(`        Input: ${inputStr}`);
            }

            if (context?.expectedOutputSchema) {
              log.plain(
                `        Expected output schema: ${context.expectedOutputSchema}`
              );
            }

            // Show parsed error details if available
            if (context?.parsedError) {
              const parsed = context.parsedError;
              if (parsed.field) {
                if (parsed.errorType === 'missing_argument') {
                  log.plain(
                    `        Field "${parsed.field}" is required but was not provided`
                  );
                } else if (parsed.inputType) {
                  log.plain(
                    `        Field "${parsed.field}" received ${parsed.inputType}${parsed.inputValue && parsed.inputValue !== '{}' ? ` (${parsed.inputValue})` : ''}`
                  );
                }
              }
            }

            if (error.suggestion) {
              log.plain(`        Suggestion: ${error.suggestion}`);
            }

            log.blank();
          }
        }

        if (toolWarnings.length > 0) {
          log.plain('    Warnings:');
          for (const warning of toolWarnings) {
            log.warn(`      ${warning.code}: ${warning.message}`);
            if (warning.suggestion) {
              log.plain(`        Suggestion: ${warning.suggestion}`);
            }
          }
        }
      }
    }
  }

  log.blank();
}

/**
 * Format test results as JSON.
 */
export function formatJSONResults(result: TestOrchestratorResult): string {
  const json = {
    verdict: result.verdict,
    summary: {
      toolsTested: result.toolsTested,
      toolsPassed: result.toolsPassed,
      toolsFailed: result.toolsFailed,
      errors: result.diagnostics.filter(d => d.severity === 'error').length,
      warnings: result.diagnostics.filter(d => d.severity === 'warning').length,
    },
    diagnostics: result.diagnostics.map(d => ({
      code: d.code,
      severity: d.severity,
      message: d.message,
      tool: d.tool,
      field: d.field,
      suggestion: d.suggestion,
      context: d.context,
    })),
    tools: result.toolResults.map(tr => ({
      toolName: tr.toolName,
      passed: tr.passed,
      summary: tr.summary,
      diagnostics: tr.diagnostics.map(d => ({
        code: d.code,
        severity: d.severity,
        message: d.message,
        suggestion: d.suggestion,
        context: d.context,
      })),
    })),
  };

  return JSON.stringify(json, null, 2);
}
