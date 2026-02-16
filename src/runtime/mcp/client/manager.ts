/**
 * MCP Client Manager.
 * Manages MCP client connections and tool execution with event integration.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as childProcess from 'child_process';
import type { EventEmitter } from '@/events/emitter';
import { TransportEventType } from '@/events/event-type';
import { getConnectedClient } from '../connection';
import { ConfigurationError } from '@/utils/errors';
import { log } from '@/utils/logger';
import type { TransportType } from '@/config/types';
import type { MCPURL, Command } from '@/types/ids';
import { parseCommand, setupProcessLogCapture, spawnProcess } from './process';
import { BaseMCPClientManager } from './base';

/**
 * MCP client manager interface.
 */
export interface MCPClientManager {
  /**
   * Connect to the MCP server.
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the MCP server.
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Get available tools from the MCP server.
   * @returns Array of tool definitions
   */
  getAvailableTools(): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  >;

  /**
   * Execute a tool call.
   * @param toolName - Name of the tool to execute
   * @param toolArguments - Tool arguments
   * @param executionMode - Whether to actually execute (true) or just preview (false)
   * @returns Tool execution result
   */
  executeTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
    executionMode: boolean
  ): Promise<unknown>;

  /**
   * Check if the manager is connected.
   * @returns true if connected
   */
  isConnected(): boolean;

  /**
   * Get the transport type.
   * @returns Transport type
   */
  getTransportType(): TransportType;
}

/**
 * HTTP-based MCP client manager.
 */
export class HTTPMCPClientManager
  extends BaseMCPClientManager
  implements MCPClientManager
{
  private transport: StreamableHTTPClientTransport | null = null;
  private process: childProcess.ChildProcess | null = null;

  constructor(
    private readonly mcpUrl: string,
    eventEmitter: EventEmitter,
    private readonly shouldSpawn: boolean = false,
    private readonly serverCommand?: string
  ) {
    super(eventEmitter);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Spawn server process if needed
      if (this.shouldSpawn && this.serverCommand) {
        this.spawnServer();
        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Emit transport initialization event
      await this.eventEmitter.emit(TransportEventType.TRANSPORT_INITIALIZED, {
        transport_type: 'http',
        endpoint: this.mcpUrl,
        ...(this.shouldSpawn && this.serverCommand
          ? { command: this.serverCommand }
          : {}),
      });

      const connection = await getConnectedClient(
        this.mcpUrl,
        undefined,
        10000
      );
      this.client = connection.client;
      this.transport = connection.transport;
      this.connected = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Clean up spawned process on error
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      // Emit transport error event
      await this.eventEmitter.emit(TransportEventType.TRANSPORT_ERROR, {
        transport_type: 'http',
        error_message: errorMessage,
        error_code: 'CONNECTION_FAILED',
        recoverable: true,
      });

      throw new ConfigurationError(
        `Failed to connect to MCP server at ${this.mcpUrl}: ${errorMessage}`
      );
    }
  }

  /**
   * Spawn the HTTP server as a child process and capture logs.
   */
  private spawnServer(): void {
    if (!this.serverCommand) {
      throw new ConfigurationError('Server command is required for spawning');
    }

    const command = this.serverCommand.trim();
    if (!command) {
      throw new ConfigurationError('Server command is empty');
    }

    const { executable, args } = parseCommand(command);
    this.process = spawnProcess(executable, args);
    setupProcessLogCapture(this.process);

    // Handle process errors
    this.process.on('error', (error: Error) => {
      void this.emitTransportError(
        `Failed to spawn server process: ${error.message}`,
        'SPAWN_ERROR',
        false
      );
    });

    // Handle process exit
    this.process.on('exit', (code: number | null, signal: string | null) => {
      if (code !== null && code !== 0) {
        void this.emitTransportError(
          `Server process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
          'SERVER_EXIT',
          false
        );
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      // v1.5.0: Kill the spawned server process to prevent leaks
      if (this.process) {
        this.process.kill('SIGTERM');
        // Give process time to terminate gracefully, then force kill if needed
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 1000);

          this.process?.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        this.process = null;
      }

      if (this.transport) {
        await this.transport.close();
      }

      this.connected = false;
      this.client = null;
      this.transport = null;
    } catch (error) {
      // Log but don't throw - cleanup errors are non-critical
      const err = error instanceof Error ? error : new Error(String(error));
      log.error(`Error: ${err.message}`, err);

      await this.eventEmitter.emit(TransportEventType.TRANSPORT_ERROR, {
        transport_type: 'http',
        error_message: err.message,
        error_code: 'DISCONNECT_ERROR',
        recoverable: false,
      });
    }
  }

  getTransportType(): TransportType {
    return 'http';
  }
}

/**
 * Stdio-based MCP client manager.
 */
export class StdioMCPClientManager
  extends BaseMCPClientManager
  implements MCPClientManager
{
  private transport: StdioClientTransport | null = null;
  private process: childProcess.ChildProcess | null = null;

  constructor(
    private readonly command: string,
    eventEmitter: EventEmitter
  ) {
    super(eventEmitter);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      const command = this.command.trim();
      if (!command) {
        throw new ConfigurationError('Command is empty');
      }

      const { executable, args } = parseCommand(command);

      // Emit transport initialization event
      await this.eventEmitter.emit(TransportEventType.TRANSPORT_INITIALIZED, {
        transport_type: 'stdio',
        command: this.command,
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'syrin',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Spawn the process
      this.process = spawnProcess(executable, args);
      setupProcessLogCapture(this.process);

      // Create stdio transport
      this.transport = new StdioClientTransport({
        command: executable,
        args,
        env: process.env as Record<string, string>,
      });

      // Set up error handler - log and emit errors instead of swallowing them
      this.client.onerror = (error: Error): void => {
        log.error('MCP protocol error', error);
        if (this.eventEmitter) {
          this.eventEmitter.emit(TransportEventType.TRANSPORT_ERROR, {
            transport_type: 'stdio',
            error_message: error.message,
            error_code: 'MCP_PROTOCOL_ERROR',
            recoverable: false,
          });
        }
      };

      // Set up process error handler
      this.process.on('error', (error: Error) => {
        throw new Error(`Failed to start process: ${error.message}`);
      });

      // Connect with timeout
      const connectionPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (this.process) {
            this.process.kill();
          }
          reject(new Error(`Connection timeout after 10000ms`));
        }, 10000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      this.connected = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Clean up on error
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      // Emit transport error event
      await this.eventEmitter.emit(TransportEventType.TRANSPORT_ERROR, {
        transport_type: 'stdio',
        error_message: errorMessage,
        error_code: 'CONNECTION_FAILED',
        recoverable: true,
      });

      throw new ConfigurationError(
        `Failed to connect to MCP server via stdio: ${errorMessage}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      // v1.5.0: Kill the child process to prevent leaks
      // Must kill process BEFORE closing transport to ensure cleanup
      if (this.process) {
        this.process.kill('SIGTERM');
        // Give process time to terminate gracefully, then force kill if needed
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 1000);

          this.process?.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        this.process = null;
      }

      if (this.transport) {
        await this.transport.close();
      }
      this.connected = false;
      this.client = null;
      this.transport = null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error(`Error: ${err.message}`, err);
      await this.emitTransportError(err.message, 'DISCONNECT_ERROR', false);
    }
  }

  getTransportType(): TransportType {
    return 'stdio';
  }
}

/**
 * Factory function to create an MCP client manager.
 * @param transport - Transport type
 * @param mcpUrl - MCP URL (for HTTP transport)
 * @param command - Command to spawn server (optional, only if shouldSpawn is true)
 * @param eventEmitter - Event emitter for emitting events
 * @param shouldSpawn - Whether to spawn the server as a child process
 * @returns MCP client manager instance
 */
export function createMCPClientManager(
  transport: TransportType,
  mcpUrl: MCPURL | string | undefined,
  command: Command | string | undefined,
  eventEmitter: EventEmitter,
  shouldSpawn: boolean = false
): MCPClientManager {
  if (transport === 'http') {
    if (!mcpUrl) {
      throw new ConfigurationError('MCP URL is required for HTTP transport');
    }
    return new HTTPMCPClientManager(mcpUrl, eventEmitter, shouldSpawn, command);
  }

  if (transport === 'stdio') {
    if (!command) {
      throw new ConfigurationError('Command is required for stdio transport');
    }
    return new StdioMCPClientManager(command, eventEmitter);
  }

  throw new ConfigurationError(
    `Unsupported transport type: ${String(transport)}`
  );
}
