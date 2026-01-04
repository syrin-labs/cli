/**
 * MCP tool loader.
 * Loads raw tool metadata from MCP servers.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { listTools } from '@/runtime/mcp/list';
import type { RawTool } from './types';

/**
 * Load raw tools from MCP server.
 * This is the entry point that fetches tool metadata without execution.
 *
 * @param client - Connected MCP client
 * @returns Array of raw tool definitions
 */
export async function loadMCPTools(client: Client): Promise<RawTool[]> {
  const result = await listTools(client);

  return (result.tools || []).map(tool => ({
    name: tool.name || '',
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  }));
}
