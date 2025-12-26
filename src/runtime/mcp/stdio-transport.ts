/**
 * Stdio transport utilities for MCP.
 * Provides functions to get connected clients via stdio transport.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as childProcess from 'child_process';
import type { Command } from '@/types/ids';

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
  command: Command | string,
  timeout: number = 10000
): Promise<{
  client: Client;
  transport: StdioClientTransport;
  process: childProcess.ChildProcess;
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

  // Spawn the process
  const childProc = childProcess.spawn(executable, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env as Record<string, string>,
  });

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

  // Set up process error handler
  childProc.on('error', (error: Error) => {
    throw new Error(`Failed to start process: ${error.message}`);
  });

  // Try to connect with timeout
  const connectionPromise = client.connect(transport);

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      childProc.kill();
      reject(new Error(`Connection timeout after ${timeout}ms`));
    }, timeout);
  });

  // Race between connection and timeout
  try {
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error) {
    // Clean up on error
    childProc.kill();
    throw error;
  }

  return { client, transport, process: childProc };
}
