/**
 * Test Results UI for MCP Connection Testing.
 * Provides a minimalistic, easy-to-read display of connection test results.
 */

import type { MCPConnectionResult } from '@/runtime/mcp/types';
import type { TransportType } from '@/config/types';
import { getVersionDisplayString } from '@/utils/version-display';
import { log } from '@/utils/logger';

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
  if (
    details?.capabilities &&
    Object.keys(details.capabilities).filter(
      key =>
        details.capabilities?.[key] !== undefined &&
        details.capabilities?.[key] !== null &&
        details.capabilities?.[key] !== false
    ).length > 0
  ) {
    const capabilityCount = Object.keys(details.capabilities).filter(
      key =>
        details.capabilities?.[key] !== undefined &&
        details.capabilities?.[key] !== null &&
        details.capabilities?.[key] !== false
    ).length;
    log.blank();
    log.heading(`  Server Capabilities (${capabilityCount}):`);
    log.label(
      '    Note: Capabilities are obtained from the initialize response'
    );

    const capabilities = details.capabilities;
    const capabilityNames = Object.keys(capabilities).filter(key => {
      const val = capabilities[key];
      return val !== undefined && val !== null && val !== false;
    });

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
