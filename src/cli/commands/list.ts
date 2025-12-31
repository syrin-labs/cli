/**
 * `syrin list` command implementation.
 * Lists tools, resources, or prompts from an MCP server.
 */

import {
  getConnectedClient,
  getConnectedStdioClient,
  listTools,
  listResources,
  listPrompts,
  closeConnection,
} from '@/runtime/mcp';
import { handleCommandError, resolveTransportConfig } from '@/cli/utils';
import { ConfigurationError } from '@/utils/errors';
import { Messages, ListTypes, TransportTypes } from '@/constants';
import type { TransportType } from '@/config/types';
import type { ListType } from '@/constants/list';
import {
  displayTools,
  displayResources,
  displayPrompts,
} from '@/presentation/list-ui';

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
    const { type = ListTypes.TOOLS } = options;

    // Resolve transport configuration from options and config
    const {
      transport: finalTransport,
      url: mcpUrl,
      script: mcpCommand,
      urlSource,
    } = resolveTransportConfig(options);

    // Connect to MCP server based on transport type
    let client;
    let mcpTransport;
    try {
      if (finalTransport === TransportTypes.HTTP) {
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

      if (finalTransport === TransportTypes.HTTP) {
        // Check for common HTTP connection errors
        if (
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ENOTFOUND')
        ) {
          const configSource =
            urlSource === 'config'
              ? Messages.LIST_SOURCE_CONFIG
              : Messages.LIST_SOURCE_CLI_URL;

          throw new ConfigurationError(
            Messages.CONNECTION_FAILED(mcpUrl!, configSource)
          );
        } else if (errorMessage.includes('timeout')) {
          throw new ConfigurationError(
            Messages.CONNECTION_TIMEOUT_HTTP(mcpUrl!)
          );
        }
      } else {
        // stdio transport errors
        if (errorMessage.includes('spawn') || errorMessage.includes('ENOENT')) {
          throw new ConfigurationError(
            Messages.CONNECTION_FAILED_STDIO(mcpCommand!)
          );
        } else if (errorMessage.includes('timeout')) {
          throw new ConfigurationError(Messages.CONNECTION_TIMEOUT_STDIO);
        }
      }
      // Re-throw if we don't have a specific handler
      throw connectionError;
    }

    try {
      // List based on type
      if (type === ListTypes.TOOLS) {
        const toolsResult = await listTools(client);
        await displayTools(toolsResult.tools);
      } else if (type === ListTypes.RESOURCES) {
        const resourcesResult = await listResources(client);
        await displayResources(resourcesResult.resources);
      } else if (type === ListTypes.PROMPTS) {
        const promptsResult = await listPrompts(client);
        await displayPrompts(promptsResult.prompts);
      }
    } finally {
      // Always close the connection
      await closeConnection(mcpTransport);
    }
  } catch (error) {
    handleCommandError(
      error,
      Messages.LIST_ERROR_FAILED(options.type || 'items')
    );
  }
}
