/**
 * MCP listing utilities.
 * Provides functions to list tools, resources, and prompts from MCP servers.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Helper function to handle errors consistently across list functions.
 */
function handleListError(operation: string, error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to list ${operation}: ${errorMessage}`);
}

/**
 * List all tools available from the MCP server.
 */
export async function listTools(client: Client): Promise<{
  tools: Array<{
    name: string;
    title?: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
  }>;
}> {
  try {
    const response = await client.listTools();
    return {
      tools: response.tools || [],
    };
  } catch (error) {
    handleListError('tools', error);
  }
}

/**
 * List all resources available from the MCP server.
 */
export async function listResources(client: Client): Promise<{
  resources: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
}> {
  try {
    const response = await client.listResources();
    return {
      resources: response.resources || [],
    };
  } catch (error) {
    handleListError('resources', error);
  }
}

/**
 * List all prompts available from the MCP server.
 */
export async function listPrompts(client: Client): Promise<{
  prompts: Array<{
    name: string;
    title?: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
}> {
  try {
    const response = await client.listPrompts();
    return {
      prompts: response.prompts || [],
    };
  } catch (error) {
    handleListError('prompts', error);
  }
}

/**
 * Close the MCP transport connection.
 */
export async function closeConnection(
  transport: StreamableHTTPClientTransport | StdioClientTransport
): Promise<void> {
  try {
    await transport.close();
  } catch {
    // Ignore errors during cleanup
  }
}
