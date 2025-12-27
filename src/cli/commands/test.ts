/**
 * `syrin test` command implementation.
 * Tests MCP connections and validates MCP protocol compliance.
 */

import { loadConfig } from '@/config/loader';
import { connectMCP } from '@/runtime/mcp';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Icons, Labels, Messages } from '@/constants';
import type { MCPConnectionResult } from '@/runtime/mcp/types';
import type { TransportType } from '@/config/types';

interface TestCommandOptions {
  transport?: TransportType;
  url?: string;
  script?: string;
  projectRoot?: string;
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
 * Display connection test results in a formatted way.
 */
function displayTestResults(result: MCPConnectionResult): void {
  console.log('\n' + '='.repeat(50));
  console.log('MCP Connection Test Results');
  console.log('='.repeat(50) + '\n');

  if (result.success) {
    console.log(`${Icons.SUCCESS} Connection test successful!\n`);
  } else {
    console.log(`${Icons.FAILURE} Connection test failed\n`);
    if (result.error) {
      console.log(`Error: ${result.error}\n`);
    }
  }

  if (result.details) {
    const details = result.details;
    const statusIcon = result.success ? ` ${Icons.SUCCESS}` : '';

    // Basic connection info
    console.log('Connection Details:');
    if (result.transport === 'http') {
      console.log(
        `  ${Labels.MCP_URL} ${details.mcpUrl || 'N/A'}${statusIcon}`
      );
    } else if (result.transport === 'stdio') {
      console.log(
        `  ${Labels.COMMAND} ${details.command || 'N/A'}${statusIcon}`
      );
    }

    if (details.protocolVersion) {
      console.log(`  Protocol Version: ${details.protocolVersion}`);
    }

    if (details.sessionId) {
      console.log(`  Session ID: ${details.sessionId}`);
    }

    // Show initialize request/response details (only for HTTP transport)
    if (
      details.initializeRequest &&
      result.success &&
      result.transport === 'http'
    ) {
      console.log('\n  Initialize Handshake:');
      console.log(
        `    Note: MCP uses Server-Sent Events (SSE) transport. Messages are sent via HTTP POST`
      );
      console.log(
        `    and responses are received via HTTP GET with text/event-stream.\n`
      );
      console.log(`    Request:`);
      console.log(`      HTTP Method: ${details.initializeRequest.method}`);
      console.log(`      URL: ${details.initializeRequest.url}`);
      if (details.initializeRequest.headers) {
        console.log(`      Headers:`);
        for (const [key, value] of Object.entries(
          details.initializeRequest.headers
        )) {
          console.log(`        ${key}: ${value}`);
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
          console.log(`      JSON-RPC Method: ${body.method}`);
        }
        if (body.params?.protocolVersion) {
          console.log(`      Protocol Version: ${body.params.protocolVersion}`);
        }
        if (body.params?.clientInfo) {
          console.log(
            `      Client Info: ${body.params.clientInfo.name} v${body.params.clientInfo.version}`
          );
        }
      }

      if (details.initializeResponse) {
        console.log(`    Response:`);
        if (details.initializeResponse.statusCode) {
          console.log(`      Status: ${details.initializeResponse.statusCode}`);
        }
        if (details.initializeResponse.headers) {
          console.log(`      Response Headers:`);
          for (const [key, value] of Object.entries(
            details.initializeResponse.headers
          )) {
            console.log(`        ${key}: ${value}`);
          }
        }
        console.log(
          `      Note: Server capabilities are returned in the initialize response`
        );
      }
    }

    // Display capabilities with explanations
    if (details.capabilities) {
      const capabilities = details.capabilities;
      const capabilityNames = Object.keys(capabilities).filter(key => {
        const value = capabilities[key];
        return value !== undefined && value !== null && value !== false;
      });
      if (capabilityNames.length > 0) {
        console.log(`\n  Server Capabilities (${capabilityNames.length}):`);
        console.log(
          `    Note: Capabilities are obtained from the initialize response`
        );
        for (const capabilityName of capabilityNames) {
          const capability = capabilities[capabilityName];
          // If capability is an object with properties, show the properties
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
              console.log(`    - ${capabilityName}:`);
              for (const prop of props) {
                const explanation = explainCapabilityProperty(
                  capabilityName,
                  prop
                );
                const explanationText = explanation ? ` (${explanation})` : '';
                console.log(`        • ${prop}${explanationText}`);
              }
            } else {
              console.log(`    - ${capabilityName}`);
            }
          } else {
            // Simple capability (truthy value)
            const explanation = explainCapabilityProperty(capabilityName, '*');
            const explanationText = explanation ? ` (${explanation})` : '';
            console.log(`    - ${capabilityName}${explanationText}`);
          }
        }
      }
    }

    console.log('');
  }
}

/**
 * Execute the test command.
 *
 * @param options - Command options
 */
export async function executeTest(options: TestCommandOptions): Promise<void> {
  const { transport, url, script, projectRoot } = options;

  try {
    // Load config to get default values
    const config = loadConfig(projectRoot);

    // Determine transport type
    const transportType: TransportType = transport || config.transport;
    let mcpUrl: string | undefined;
    let mcpCommand: string | undefined;

    if (transportType === 'http') {
      // Use provided URL or fall back to config
      mcpUrl = url || config.mcp_url;
    } else {
      // Use provided script or fall back to config.script
      mcpCommand =
        script || (config.script ? String(config.script) : undefined);
    }

    // Validate that we have the required parameters
    if (transportType === 'http' && !mcpUrl) {
      throw new ConfigurationError(
        'MCP URL is required. Provide it as an argument or ensure it is set in config.yaml'
      );
    }

    if (transportType === 'stdio' && !mcpCommand) {
      throw new ConfigurationError(
        'Script is required. Provide it as an argument (--script) or ensure script is set in config.yaml'
      );
    }

    // Perform the test
    console.log(`\nTesting ${transportType} transport...`);
    if (transportType === 'http' && mcpUrl) {
      console.log(`${Labels.MCP_URL} ${mcpUrl}`);
    } else if (transportType === 'stdio' && mcpCommand) {
      console.log(`${Labels.COMMAND} ${mcpCommand}`);
    }

    const result = await connectMCP({
      transport: transportType,
      url: mcpUrl,
      command: mcpCommand,
    });

    // Display results
    displayTestResults(result);

    // Exit with appropriate code
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      logger.error('Test command failed', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Test command failed', err);
    console.error(
      `\n${Icons.ERROR} ${Messages.ERROR_UNEXPECTED}: ${err.message}\n`
    );
    process.exit(1);
  }
}
