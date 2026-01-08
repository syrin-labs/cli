/**
 * `syrin list` command implementation.
 * Lists tools, resources, or prompts from an MCP server.
 */

import { listTools, listResources, listPrompts } from '@/runtime/mcp';
import {
  handleCommandError,
  resolveTransportConfig,
  establishConnection,
  safeCloseConnection,
  type TransportCommandOptions,
} from '@/cli/utils';
import { Messages, ListTypes } from '@/constants';
import type { ListType } from '@/constants/list';
import {
  displayTools,
  displayResources,
  displayPrompts,
} from '@/presentation/list-ui';

interface ListCommandOptions extends TransportCommandOptions {
  type?: ListType;
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
      env,
      authHeaders,
    } = resolveTransportConfig(options);

    // Connect to MCP server with centralized error handling
    const { client, transport: mcpTransport } = await establishConnection({
      transport: finalTransport,
      url: mcpUrl,
      script: mcpCommand,
      urlSource,
      env,
      authHeaders,
    });

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
      // Always close the connection safely
      await safeCloseConnection(mcpTransport);
    }
  } catch (error) {
    handleCommandError(
      error,
      Messages.LIST_ERROR_FAILED(options.type || 'items')
    );
  }
}
