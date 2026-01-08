/**
 * Connection handling utilities.
 * Provides shared logic for establishing MCP connections with consistent error handling.
 */

import {
  getConnectedClient,
  getConnectedStdioClient,
  closeConnection,
} from '@/runtime/mcp';
import { ConfigurationError } from '@/utils/errors';
import { Messages, TransportTypes } from '@/constants';
import type { TransportType } from '@/config/types';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ConnectionResult {
  client: Client;
  transport: StreamableHTTPClientTransport | StdioClientTransport;
}

export interface ConnectionOptions {
  transport: TransportType;
  url?: string;
  script?: string;
  urlSource?: 'config' | 'cli';
  env?: Record<string, string>;
  authHeaders?: Record<string, string>;
}

/**
 * Establish an MCP connection with proper error handling.
 * This centralizes connection logic and error handling for all commands.
 *
 * @param options - Connection options including transport type and connection details
 * @returns Connected client and transport instances
 * @throws ConfigurationError with helpful error messages for common connection failures
 */
export async function establishConnection(
  options: ConnectionOptions
): Promise<ConnectionResult> {
  const { transport, url, script, urlSource, env, authHeaders } = options;

  try {
    if (transport === TransportTypes.HTTP) {
      if (!url) {
        throw new ConfigurationError(Messages.TRANSPORT_URL_REQUIRED);
      }
      const connection = await getConnectedClient(url, authHeaders);
      return {
        client: connection.client,
        transport: connection.transport,
      };
    } else {
      if (!script) {
        throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED);
      }
      const connection = await getConnectedStdioClient(script, env);
      return {
        client: connection.client,
        transport: connection.transport,
      };
    }
  } catch (connectionError) {
    // Provide helpful error messages for connection failures
    const errorMessage =
      connectionError instanceof Error
        ? connectionError.message
        : String(connectionError);

    if (transport === TransportTypes.HTTP) {
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
          Messages.CONNECTION_FAILED(url || '', configSource, 'http')
        );
      } else if (errorMessage.includes('timeout')) {
        throw new ConfigurationError(
          Messages.CONNECTION_TIMEOUT_HTTP(url || '')
        );
      }
    } else {
      // stdio transport errors
      if (errorMessage.includes('spawn') || errorMessage.includes('ENOENT')) {
        throw new ConfigurationError(
          Messages.CONNECTION_FAILED_STDIO(script || '')
        );
      } else if (errorMessage.includes('timeout')) {
        throw new ConfigurationError(Messages.CONNECTION_TIMEOUT_STDIO);
      }
    }
    // Re-throw if we don't have a specific handler
    throw connectionError;
  }
}

/**
 * Safely close a connection, handling any errors gracefully.
 * This ensures connections are always cleaned up even if errors occur.
 *
 * @param transport - The transport to close (may be undefined)
 */
export async function safeCloseConnection(
  transport: StreamableHTTPClientTransport | StdioClientTransport | undefined
): Promise<void> {
  if (transport) {
    try {
      await closeConnection(transport);
    } catch {
      // Log but don't throw - cleanup errors shouldn't fail the command
      // The structured logger will capture this if needed
    }
  }
}
