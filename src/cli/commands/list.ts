/**
 * `syrin list` command implementation.
 * Lists tools, resources, or prompts from an MCP server.
 */

import { loadConfig } from '@/config/loader';
import {
  getConnectedClient,
  getConnectedStdioClient,
  listTools,
  listResources,
  listPrompts,
  closeConnection,
} from '@/runtime/mcp';
import { ConfigurationError } from '@/utils/errors';
import { Icons } from '@/constants';
import type { TransportType } from '@/config/types';
import {
  displayTools,
  displayResources,
  displayPrompts,
} from '@/presentation/list-ui';

type ListType = 'tools' | 'resources' | 'prompts';

interface ListCommandOptions {
  type?: ListType;
  transport?: TransportType;
  url?: string;
  script?: string;
  projectRoot?: string;
}

/**
 * Execute the list command.
 */
export async function executeList(options: ListCommandOptions): Promise<void> {
  try {
    const { type = 'tools', transport, url, script, projectRoot } = options;

    // Load config to get default values
    const config = loadConfig(projectRoot);

    // Determine transport and connection details
    const finalTransport: TransportType = transport || config.transport;
    let mcpUrl: string | undefined;
    let mcpCommand: string | undefined;

    if (finalTransport === 'http') {
      // Use provided URL or fall back to config
      mcpUrl = url || config.mcp_url;
    } else {
      // Use provided script or fall back to config.script
      mcpCommand =
        script || (config.script ? String(config.script) : undefined);
    }

    // Validate required parameters
    if (finalTransport === 'http') {
      if (!mcpUrl) {
        throw new ConfigurationError(
          'MCP URL is required for HTTP transport. Set it in config.yaml or use --url option.'
        );
      }
    } else if (finalTransport === 'stdio') {
      if (!mcpCommand) {
        throw new ConfigurationError(
          'Script is required for stdio transport. Set it in config.yaml or use --script option.'
        );
      }
    }

    // Connect to MCP server based on transport type
    let client;
    let mcpTransport;
    try {
      if (finalTransport === 'http') {
        const connection = await getConnectedClient(mcpUrl!);
        client = connection.client;
        mcpTransport = connection.transport;
      } else {
        const connection = await getConnectedStdioClient(mcpCommand!);
        client = connection.client;
        mcpTransport = connection.transport;
      }
    } catch (connectionError) {
      // Provide helpful error messages for connection failures
      const errorMessage =
        connectionError instanceof Error
          ? connectionError.message
          : String(connectionError);

      if (finalTransport === 'http') {
        // Check for common HTTP connection errors
        if (
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ENOTFOUND')
        ) {
          const config = loadConfig(projectRoot);
          const configSource =
            config.transport === 'http' && config.mcp_url === mcpUrl
              ? ' (from config.yaml)'
              : '';

          throw new ConfigurationError(
            `Cannot connect to MCP server at ${mcpUrl}${configSource}.\n` +
              `\n` +
              `The server appears to be not running or unreachable.\n` +
              `\n` +
              `To fix this:\n` +
              `  1. Make sure the MCP server is running\n` +
              `  2. Verify the URL is correct: ${mcpUrl}\n` +
              `  3. Check if the server is listening on the expected port\n`
          );
        } else if (errorMessage.includes('timeout')) {
          throw new ConfigurationError(
            `Connection to MCP server at ${mcpUrl} timed out.\n` +
              `The server may be slow to respond or not running.`
          );
        }
      } else {
        // stdio transport errors
        if (errorMessage.includes('spawn') || errorMessage.includes('ENOENT')) {
          throw new ConfigurationError(
            `Failed to start MCP server process: ${mcpCommand}\n` +
              `\n` +
              `The script may be incorrect or the executable not found.\n` +
              `Verify the script path in config.yaml or use --script option.`
          );
        } else if (errorMessage.includes('timeout')) {
          throw new ConfigurationError(
            `Connection to MCP server via stdio timed out.\n` +
              `The server process may have failed to start or is not responding.`
          );
        }
      }
      // Re-throw if we don't have a specific handler
      throw connectionError;
    }

    try {
      // List based on type
      if (type === 'tools') {
        const toolsResult = await listTools(client);
        displayTools(toolsResult.tools);
      } else if (type === 'resources') {
        const resourcesResult = await listResources(client);
        displayResources(resourcesResult.resources);
      } else if (type === 'prompts') {
        const promptsResult = await listPrompts(client);
        displayPrompts(promptsResult.prompts);
      }
    } finally {
      // Always close the connection
      await closeConnection(mcpTransport);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else {
      console.error(
        `\n${Icons.ERROR} Failed to list ${options.type || 'items'}\n`
      );
      process.exit(1);
    }
  }
}
