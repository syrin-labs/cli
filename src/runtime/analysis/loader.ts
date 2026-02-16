/**
 * MCP tool loader.
 * Loads raw tool metadata from MCP servers.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { listTools } from '@/runtime/mcp/list';
import type { RawTool } from './types';

/**
 * Progress callback for tool loading.
 */
export type LoadProgressCallback = (
  stage: 'connecting' | 'listing' | 'validating',
  progress: number
) => void;

/**
 * Load raw tools from MCP server.
 * This is the entry point that fetches tool metadata without execution.
 *
 * @param client - Connected MCP client
 * @param onProgress - Optional progress callback
 * @returns Array of raw tool definitions
 */
export async function loadMCPTools(
  client: Client,
  onProgress?: LoadProgressCallback
): Promise<RawTool[]> {
  if (onProgress) {
    onProgress('connecting', 0);
  }

  let result;
  try {
    if (onProgress) {
      onProgress('listing', 30);
    }
    result = await listTools(client);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load tools from MCP server: ${errorMessage}`, {
      cause: error,
    });
  }

  const tools = result.tools || [];

  if (onProgress) {
    onProgress('validating', 60);
  }

  // Validate each tool before mapping
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    if (!tool) {
      throw new Error(`Tool at index ${i} is undefined`);
    }
    if (!tool.name) {
      const toolSummary = JSON.stringify({
        description: tool.description,
        inputSchema: tool.inputSchema ? 'present' : 'missing',
        outputSchema: tool.outputSchema ? 'present' : 'missing',
      });
      throw new Error(`Missing tool.name at index ${i}: ${toolSummary}`);
    }

    // Report progress during validation for large tool lists
    if (onProgress && tools.length > 10) {
      const progress = 60 + Math.floor((i / tools.length) * 30);
      onProgress('validating', progress);
    }
  }

  if (onProgress) {
    onProgress('validating', 100);
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  }));
}
