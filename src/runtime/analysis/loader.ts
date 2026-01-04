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
  let result;
  try {
    result = await listTools(client);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load tools from MCP server: ${errorMessage}`, {
      cause: error,
    });
  }

  const tools = result.tools || [];

  // Validate each tool before mapping
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    if (!tool.name) {
      const toolSummary = JSON.stringify({
        description: tool.description,
        inputSchema: tool.inputSchema ? 'present' : 'missing',
        outputSchema: tool.outputSchema ? 'present' : 'missing',
      });
      throw new Error(`Missing tool.name at index ${i}: ${toolSummary}`);
    }
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  }));
}
