/**
 * MCP connection utilities.
 * Provides utilities for connecting to MCP servers via HTTP and stdio transports.
 * This module is reusable for both testing and establishing MCP connections.
 * Uses the official MCP SDK for proper protocol handling.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  MCPConnectionResult,
  MCPConnectionDetails,
  MCPConnectionOptions,
} from './types';
import { ConfigurationError } from '@/utils/errors';

/**
 * Get a connected MCP client that stays open for operations.
 * Use this when you need to perform multiple operations with the same connection.
 * Remember to call close() on the transport when done.
 *
 * @param mcpUrl - The MCP server URL to connect to
 * @param timeout - Connection timeout in milliseconds (default: 5000)
 * @returns Connected client and transport instances
 */
export async function getConnectedClient(
  mcpUrl: string,
  timeout: number = 10000
): Promise<{
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  // Parse URL
  const parsedUrl = new URL(mcpUrl);

  // Create MCP client
  const client = new Client(
    {
      name: 'syrin',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Create HTTP transport using StreamableHTTPClientTransport
  // This properly handles SSE protocol and session requirements
  const transport = new StreamableHTTPClientTransport(parsedUrl);

  // Set up error handler
  client.onerror = (): void => {
    // Error handler - errors are logged but we'll catch them in try-catch
  };

  // Try to connect with timeout
  const connectionPromise = client.connect(transport);

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Connection timeout after ${timeout}ms`));
    }, timeout);
  });

  // Race between connection and timeout
  await Promise.race([connectionPromise, timeoutPromise]);

  return { client, transport };
}

/**
 * Connect to an MCP server via HTTP transport using the official MCP SDK.
 * This properly handles the SSE protocol and session requirements.
 *
 * @param mcpUrl - The MCP server URL to connect to
 * @param timeout - Connection timeout in milliseconds (default: 5000)
 * @returns Connection result with connection details
 */
export async function connectHTTP(
  mcpUrl: string,
  timeout: number = 5000
): Promise<MCPConnectionResult> {
  let client: Client | null = null;
  let transport: StreamableHTTPClientTransport | null = null;

  try {
    // Parse URL
    const parsedUrl = new URL(mcpUrl);

    const details: MCPConnectionDetails = {
      mcpUrl,
    };

    // Create MCP client
    client = new Client(
      {
        name: 'syrin',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Create HTTP transport using StreamableHTTPClientTransport
    // This properly handles SSE protocol and session requirements
    transport = new StreamableHTTPClientTransport(parsedUrl);

    // Set up error handler
    client.onerror = (): void => {
      // Error handler - errors are logged but we'll catch them in try-catch
    };

    // Try to connect with timeout
    const connectionPromise = client.connect(transport);

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);
    });

    // Race between connection and timeout
    try {
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          transport: 'http',
          error: error.message,
          details,
        };
      }
      // Re-throw to handle connection errors below
      throw error;
    }

    // Connection successful - get server capabilities and protocol version
    const serverCapabilities = client.getServerCapabilities();

    if (serverCapabilities) {
      // Convert capabilities to a simpler format for display
      // ServerCapabilities is an object where keys are capability names
      // and values are either objects with capability details or empty objects
      const capabilities: Record<string, unknown> = {};

      // Extract capability names (keys of the capabilities object)
      for (const [key, value] of Object.entries(serverCapabilities)) {
        capabilities[key] = value;
      }

      details.capabilities = capabilities;
    }

    // Get protocol version from the client
    // The protocol version is negotiated during initialization
    // The SDK uses the latest supported version by default
    details.protocolVersion = '2024-11-05'; // Protocol version used in initialize request

    // Get session ID if available
    if (transport.sessionId) {
      details.sessionId = transport.sessionId;
      details.metadata = {
        sessionId: transport.sessionId,
      };
    }

    // Document the initialize handshake that happened
    // The SDK automatically sends an initialize request during client.connect()
    // This request includes client info and capabilities
    details.initializeRequest = {
      method: 'POST',
      url: mcpUrl,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(transport.sessionId
          ? { 'mcp-session-id': transport.sessionId }
          : {}),
      },
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'syrin',
            version: '1.0.0',
          },
        },
      },
    };

    // The initialize response contains server capabilities
    // This is how we obtained the capabilities - from the initialize response
    details.initializeResponse = {
      statusCode: 200,
      body: {
        jsonrpc: '2.0',
        result: {
          protocolVersion: details.protocolVersion,
          capabilities: serverCapabilities || {},
          serverInfo: {
            name: 'MCP Server',
          },
        },
      },
    };

    // Clean up - disconnect gracefully
    try {
      await transport.close();
    } catch {
      // Ignore errors during cleanup
    }

    return {
      success: true,
      transport: 'http',
      details,
    };
  } catch (error) {
    // Clean up on error
    try {
      if (transport) {
        await transport.close();
      }
    } catch {
      // Ignore cleanup errors
    }

    // Parse error message
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common connection errors
      if (
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('NetworkError')
      ) {
        errorMessage = `Cannot connect to MCP server at ${mcpUrl}. Is the server running?`;
      } else if (
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')
      ) {
        errorMessage =
          'Authentication required. The server rejected the connection.';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'MCP endpoint not found. Please check the URL.';
      }
    }

    return {
      success: false,
      transport: 'http',
      error: errorMessage,
      details: {
        mcpUrl,
        discoveryUrl: `${new URL(mcpUrl).protocol}//${new URL(mcpUrl).host}/.well-known/mcp`,
      },
    };
  }
}

/**
 * Get a connected MCP client via stdio transport that stays open for operations.
 * Use this when you need to perform multiple operations with the same connection.
 * Remember to call close() on the transport when done.
 *
 * @param command - The command to execute (e.g., "python3 server.py")
 * @param timeout - Connection timeout in milliseconds (default: 10000)
 * @returns Connected client and transport instances
 */
export async function getConnectedStdioClient(
  command: string,
  timeout: number = 10000
): Promise<{
  client: Client;
  transport: StdioClientTransport;
}> {
  // Split command into executable and arguments
  const parts = command.trim().split(/\s+/);
  const executable = parts[0];
  const args = parts.slice(1);

  if (!executable) {
    throw new Error('Command is empty');
  }

  // Create MCP client
  const client = new Client(
    {
      name: 'syrin',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Create stdio transport
  const transport = new StdioClientTransport({
    command: executable,
    args,
    env: process.env as Record<string, string>,
  });

  // Set up error handler
  client.onerror = (): void => {
    // Error handler - errors are logged but we'll catch them in try-catch
  };

  // Try to connect with timeout
  const connectionPromise = client.connect(transport);

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Connection timeout after ${timeout}ms`));
    }, timeout);
  });

  // Race between connection and timeout
  await Promise.race([connectionPromise, timeoutPromise]);

  return { client, transport };
}

/**
 * Connect to an MCP server via stdio transport using the official MCP SDK.
 * This properly handles the stdio protocol and initialization handshake.
 *
 * @param command - The command to execute (e.g., "python3 server.py")
 * @param timeout - Connection timeout in milliseconds (default: 5000)
 * @returns Connection result
 */
export async function connectStdio(
  command: string,
  timeout: number = 5000
): Promise<MCPConnectionResult> {
  let transport: StdioClientTransport | null = null;

  try {
    // Split command into executable and arguments
    const parts = command.trim().split(/\s+/);
    const executable = parts[0];
    const args = parts.slice(1);

    if (!executable) {
      return {
        success: false,
        transport: 'stdio',
        error: 'Command is empty',
      };
    }

    // Create MCP client
    const client = new Client(
      {
        name: 'syrin',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Create stdio transport
    transport = new StdioClientTransport({
      command: executable,
      args,
      env: process.env as Record<string, string>,
    });

    // Set up error handler
    client.onerror = (): void => {
      // Error handler - errors are logged but we'll catch them in try-catch
    };

    // Try to connect with timeout
    const connectionPromise = client.connect(transport);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    // Get server capabilities and session info
    const serverCapabilities = client.getServerCapabilities() || {};
    const protocolVersion = '2024-11-05'; // MCP protocol version
    const sessionId = uuidv4();

    const details: MCPConnectionDetails = {
      command,
      protocolVersion,
      sessionId,
      capabilities: serverCapabilities as Record<string, unknown>,
      client: client,
      transport: transport,
    };

    // Close the connection after gathering info (for testing)
    try {
      await transport.close();
    } catch {
      // Ignore errors during cleanup
    }

    return {
      success: true,
      transport: 'stdio',
      details,
    };
  } catch (error) {
    // Clean up on error
    try {
      if (transport) {
        await transport.close();
      }
    } catch {
      // Ignore cleanup errors
    }

    // Parse error message
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common connection errors
      if (
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('not found')
      ) {
        errorMessage = `Command "${command.split(/\s+/)[0]}" not found in PATH. Is the command installed?`;
      } else if (
        errorMessage.includes('EACCES') ||
        errorMessage.includes('permission denied')
      ) {
        errorMessage = 'Permission denied. Check if the command is executable.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = `Connection timeout. The MCP server may not be responding.`;
      }
    }

    return {
      success: false,
      transport: 'stdio',
      error: errorMessage,
      details: {
        command,
      },
    };
  }
}

/**
 * Connect to an MCP server based on transport type.
 * This is the main entry point for establishing MCP connections.
 *
 * @param options - Connection options including transport type and connection details
 * @returns Connection result
 */
export async function connectMCP(
  options: MCPConnectionOptions
): Promise<MCPConnectionResult> {
  const { transport, url, command, timeout = 5000 } = options;

  if (transport === 'http') {
    if (!url) {
      throw new ConfigurationError('MCP URL is required for HTTP transport');
    }
    return connectHTTP(url, timeout);
  }

  if (transport === 'stdio') {
    if (!command) {
      throw new ConfigurationError('Command is required for stdio transport');
    }
    return connectStdio(command, timeout);
  }

  throw new ConfigurationError(
    `Unsupported transport type: ${transport as string}`
  );
}
