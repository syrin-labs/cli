/**
 * MCP Client Manager.
 * Manages MCP client connections and tool execution with event integration.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as childProcess from 'child_process';
import type { EventEmitter } from '@/events/emitter';
import {
  TransportEventType,
  ToolExecutionEventType,
} from '@/events/event-type';
import type {
  TransportInitializedPayload,
  TransportMessageSentPayload,
  TransportMessageReceivedPayload,
  TransportErrorPayload,
} from '@/events/payloads/transport';
import type {
  ToolExecutionStartedPayload,
  ToolExecutionCompletedPayload,
  ToolExecutionFailedPayload,
} from '@/events/payloads/tool';
import { getConnectedClient } from './connection';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { TransportType } from '@/config/types';
import type { MCPURL, Command } from '@/types/ids';
import { v4 as uuidv4 } from 'uuid';

/**
 * Check if a command contains shell operators that require shell execution.
 * We only detect patterns that absolutely require a shell, avoiding false positives.
 * Essential operators: &&, ||, |, ;, $, $(, `
 */
function requiresShellExecution(command: string): boolean {
  return (
    /\s+&&\s+/.test(command) || // Logical AND (e.g., "cmd1 && cmd2")
    /\s+\|\|\s+/.test(command) || // Logical OR (e.g., "cmd1 || cmd2")
    /\s+\|\s+/.test(command) || // Pipe (e.g., "cmd1 | cmd2")
    /\s+;\s+/.test(command) || // Command separator (e.g., "cmd1; cmd2")
    /\$\{/.test(command) || // Variable expansion ${VAR}
    /\$\(/.test(command) || // Command substitution $(command)
    /\$\w+/.test(command) || // Variable reference $VAR
    /`[^`]*`/.test(command) // Command substitution with backticks
  );
}

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
export class HTTPMCPClientManager implements MCPClientManager {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private process: childProcess.ChildProcess | null = null;
  private connected: boolean = false;

  constructor(
    private readonly mcpUrl: string,
    private readonly eventEmitter: EventEmitter,
    private readonly shouldSpawn: boolean = false,
    private readonly serverCommand?: string
  ) {}

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
      await this.eventEmitter.emit<TransportInitializedPayload>(
        TransportEventType.TRANSPORT_INITIALIZED,
        {
          transport_type: 'http',
          endpoint: this.mcpUrl,
          ...(this.shouldSpawn && this.serverCommand
            ? { command: this.serverCommand }
            : {}),
        }
      );

      const connection = await getConnectedClient(this.mcpUrl, 10000);
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
      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: errorMessage,
          error_code: 'CONNECTION_FAILED',
          recoverable: true,
        }
      );

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

    // Check if command requires shell execution
    const needsShell = requiresShellExecution(command);

    let executable: string;
    let args: string[];

    if (needsShell) {
      // Command contains shell operators - run through shell
      // Use the user's shell (or default to sh)
      executable = process.env.SHELL || '/bin/sh';
      args = ['-c', command];
    } else {
      // Simple command - split and execute directly
      const parts = command.split(/\s+/);
      executable = parts[0]!; // Non-null assertion: command is already validated to be non-empty
      args = parts.slice(1);
    }

    // Spawn the process
    this.process = childProcess.spawn(executable, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env as Record<string, string>,
      cwd: process.cwd(),
      shell: false, // We handle shell ourselves if needed
    });

    // Capture stdout logs
    this.process.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        // Log server output directly
        console.log(`[Server] ${message}`);
      }
    });

    // Capture stderr logs
    this.process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        // Many tools (like Python/Uvicorn) write INFO logs to stderr, which is normal
        // Only prefix with [Server Error] if it actually looks like an error
        const isError = /ERROR|CRITICAL|FATAL|Exception|Traceback|Error:/i.test(
          message
        );
        const prefix = isError ? '[Server Error]' : '[Server]';
        if (isError) {
          console.error(`${prefix} ${message}`);
        } else {
          console.log(`${prefix} ${message}`);
        }
      }
    });

    // Handle process errors
    this.process.on('error', (error: Error) => {
      void this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: `Failed to spawn server process: ${error.message}`,
          error_code: 'SPAWN_ERROR',
          recoverable: false,
        }
      );
    });

    // Handle process exit
    this.process.on('exit', (code: number | null, signal: string | null) => {
      if (code !== null && code !== 0) {
        void this.eventEmitter.emit<TransportErrorPayload>(
          TransportEventType.TRANSPORT_ERROR,
          {
            transport_type: 'http',
            error_message: `Server process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
            error_code: 'SERVER_EXIT',
            recoverable: false,
          }
        );
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.transport) {
        await this.transport.close();
      }

      this.connected = false;
      this.client = null;
      this.transport = null;
    } catch (error) {
      // Log but don't throw - cleanup errors are non-critical
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error closing transport during disconnect', err);

      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: err.message,
          error_code: 'DISCONNECT_ERROR',
          recoverable: false,
        }
      );
    }
  }

  async getAvailableTools(): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  > {
    if (!this.client || !this.connected) {
      throw new ConfigurationError('MCP client is not connected');
    }

    try {
      const response = await this.client.listTools();
      return (response.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: (tool.inputSchema as Record<string, unknown>) || {},
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: `Failed to list tools: ${errorMessage}`,
          error_code: 'LIST_TOOLS_ERROR',
          recoverable: true,
        }
      );

      throw new Error(`Failed to list tools: ${errorMessage}`);
    }
  }

  async executeTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
    executionMode: boolean
  ): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new ConfigurationError('MCP client is not connected');
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    // Emit tool execution started event
    await this.eventEmitter.emit<ToolExecutionStartedPayload>(
      ToolExecutionEventType.TOOL_EXECUTION_STARTED,
      {
        tool_name: toolName,
        arguments: toolArguments,
        execution_id: executionId,
      }
    );

    // Emit transport message sent event
    const requestMessage = JSON.stringify({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArguments,
      },
    });

    await this.eventEmitter.emit<TransportMessageSentPayload>(
      TransportEventType.TRANSPORT_MESSAGE_SENT,
      {
        transport_type: 'http',
        message_type: 'tools/call',
        size_bytes: Buffer.byteLength(requestMessage, 'utf8'),
      }
    );

    if (!executionMode) {
      // Preview mode - don't actually execute
      const duration = Date.now() - startTime;
      await this.eventEmitter.emit<ToolExecutionCompletedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          result: {
            preview: true,
            message: 'Tool call preview (not executed)',
          },
          execution_id: executionId,
          duration_ms: duration,
        }
      );
      return { preview: true, message: 'Tool call preview (not executed)' };
    }

    try {
      // Execute the tool
      const result = await this.client.callTool({
        name: toolName,
        arguments: toolArguments,
      });

      const duration = Date.now() - startTime;

      // Emit transport message received event
      const responseMessage = JSON.stringify(result);
      await this.eventEmitter.emit<TransportMessageReceivedPayload>(
        TransportEventType.TRANSPORT_MESSAGE_RECEIVED,
        {
          transport_type: 'http',
          message_type: 'tools/call_response',
          size_bytes: Buffer.byteLength(responseMessage, 'utf8'),
        }
      );

      // Extract result content
      // result.content is an array of content items
      const resultContent =
        (result.content as Array<{ type: string; text?: string }>) || [];
      const textContent = resultContent
        .filter((item: { type: string; text?: string }) => item.type === 'text')
        .map((item: { type: string; text?: string }) => item.text || '')
        .join('\n');

      const toolResult = textContent || result;

      // Emit tool execution completed event
      await this.eventEmitter.emit<ToolExecutionCompletedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          result: toolResult,
          execution_id: executionId,
          duration_ms: duration,
        }
      );

      return toolResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Emit tool execution failed event
      await this.eventEmitter.emit<ToolExecutionFailedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_FAILED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          execution_id: executionId,
          error: {
            message: errorMessage,
            code: 'TOOL_EXECUTION_ERROR',
            stack_trace: errorStack,
            error_type: 'runtime',
          },
          duration_ms: duration,
        }
      );

      // Emit transport error event
      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: errorMessage,
          error_code: 'TOOL_EXECUTION_ERROR',
          recoverable: true,
        }
      );

      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getTransportType(): TransportType {
    return 'http';
  }
}

/**
 * Stdio-based MCP client manager.
 */
export class StdioMCPClientManager implements MCPClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private process: childProcess.ChildProcess | null = null;
  private connected: boolean = false;

  constructor(
    private readonly command: string,
    private readonly eventEmitter: EventEmitter
  ) {}

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      const command = this.command.trim();
      if (!command) {
        throw new ConfigurationError('Command is empty');
      }

      // Check if command contains shell operators (needs shell execution)
      // Production-level detection: look for actual shell operators in context
      // Operators: &&, ||, |, ;, <, >, >>, <<, $, $(, `, ', ", (, ), {, }
      // Check if command requires shell execution
      const needsShell = requiresShellExecution(command);

      let executable: string;
      let args: string[];

      if (needsShell) {
        // Command contains shell operators - run through shell
        // Use the user's shell (or default to sh)
        executable = process.env.SHELL || '/bin/sh';
        args = ['-c', command];
      } else {
        // Simple command - split and execute directly
        const parts = command.split(/\s+/);
        executable = parts[0]!; // Non-null assertion: command is already validated to be non-empty
        args = parts.slice(1);
      }

      // Emit transport initialization event
      await this.eventEmitter.emit<TransportInitializedPayload>(
        TransportEventType.TRANSPORT_INITIALIZED,
        {
          transport_type: 'stdio',
          command: this.command,
        }
      );

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
      this.process = childProcess.spawn(executable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env as Record<string, string>,
      });

      // Capture stdout logs
      this.process.stdout?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          // Log server output directly
          console.log(`[Server] ${message}`);
        }
      });

      // Capture stderr logs
      this.process.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          // Many tools (like Python/Uvicorn) write INFO logs to stderr, which is normal
          // Only prefix with [Server Error] if it actually looks like an error
          const isError =
            /ERROR|CRITICAL|FATAL|Exception|Traceback|Error:/i.test(message);
          const prefix = isError ? '[Server Error]' : '[Server]';
          if (isError) {
            console.error(`${prefix} ${message}`);
          } else {
            console.log(`${prefix} ${message}`);
          }
        }
      });

      // Create stdio transport
      this.transport = new StdioClientTransport({
        command: executable,
        args,
        env: process.env as Record<string, string>,
      });

      // Set up error handler
      this.client.onerror = (): void => {
        // Error handler - errors are logged but we'll catch them in try-catch
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
      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'stdio',
          error_message: errorMessage,
          error_code: 'CONNECTION_FAILED',
          recoverable: true,
        }
      );

      throw new ConfigurationError(
        `Failed to connect to MCP server via stdio: ${errorMessage}`
      );
    }
  }

  async disconnect(): Promise<void> {
    // Always kill the process, even if not connected
    // This ensures cleanup happens on all exit scenarios
    if (this.process && !this.process.killed) {
      const pid = this.process.pid;
      try {
        // For shell-spawned processes, we need to kill the process group
        // to ensure all child processes (like Python) are killed
        if (pid) {
          try {
            // Try to kill the entire process group (negative PID)
            // This ensures child processes spawned by the shell are also killed
            process.kill(-pid, 'SIGTERM');
          } catch {
            // If process group kill fails, fall back to regular kill
            this.process.kill('SIGTERM');
          }
        } else {
          this.process.kill('SIGTERM');
        }

        // Wait up to 1 second for graceful shutdown
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => {
            resolve();
          }, 1000);

          if (this.process) {
            this.process.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });

        // Force kill if still running
        if (this.process && !this.process.killed) {
          if (pid) {
            try {
              // Kill the entire process group
              process.kill(-pid, 'SIGKILL');
            } catch {
              // Fall back to regular kill
              this.process.kill('SIGKILL');
            }
          } else {
            this.process.kill('SIGKILL');
          }
          // Wait up to 500ms for SIGKILL to take effect
          await new Promise<void>(resolve => {
            const timeout = setTimeout(() => {
              resolve();
            }, 500);
            if (this.process) {
              this.process.once('exit', () => {
                clearTimeout(timeout);
                resolve();
              });
            } else {
              clearTimeout(timeout);
              resolve();
            }
          });
        }
      } catch {
        // If kill fails, try SIGKILL as last resort
        if (this.process && !this.process.killed) {
          try {
            if (pid) {
              try {
                process.kill(-pid, 'SIGKILL');
              } catch {
                this.process.kill('SIGKILL');
              }
            } else {
              this.process.kill('SIGKILL');
            }
            // Wait a moment for it to take effect
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch {
            // Ignore errors - process might already be dead
          }
        }
      } finally {
        this.process = null;
      }
    }

    if (!this.connected) {
      return;
    }

    try {
      if (this.transport) {
        await this.transport.close();
      }
      this.connected = false;
      this.client = null;
      this.transport = null;
    } catch (error) {
      // Log but don't throw - cleanup errors are non-critical
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'stdio',
          error_message: errorMessage,
          error_code: 'DISCONNECT_ERROR',
          recoverable: false,
        }
      );
    }
  }

  async getAvailableTools(): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  > {
    if (!this.client || !this.connected) {
      throw new ConfigurationError('MCP client is not connected');
    }

    try {
      const response = await this.client.listTools();
      return (response.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: (tool.inputSchema as Record<string, unknown>) || {},
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'stdio',
          error_message: `Failed to list tools: ${errorMessage}`,
          error_code: 'LIST_TOOLS_ERROR',
          recoverable: true,
        }
      );

      throw new Error(`Failed to list tools: ${errorMessage}`);
    }
  }

  async executeTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
    executionMode: boolean
  ): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new ConfigurationError('MCP client is not connected');
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    // Emit tool execution started event
    await this.eventEmitter.emit<ToolExecutionStartedPayload>(
      ToolExecutionEventType.TOOL_EXECUTION_STARTED,
      {
        tool_name: toolName,
        arguments: toolArguments,
        execution_id: executionId,
      }
    );

    // Emit transport message sent event
    const requestMessage = JSON.stringify({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArguments,
      },
    });

    await this.eventEmitter.emit<TransportMessageSentPayload>(
      TransportEventType.TRANSPORT_MESSAGE_SENT,
      {
        transport_type: 'stdio',
        message_type: 'tools/call',
        size_bytes: Buffer.byteLength(requestMessage, 'utf8'),
      }
    );

    if (!executionMode) {
      // Preview mode - don't actually execute
      const duration = Date.now() - startTime;
      await this.eventEmitter.emit<ToolExecutionCompletedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          result: {
            preview: true,
            message: 'Tool call preview (not executed)',
          },
          execution_id: executionId,
          duration_ms: duration,
        }
      );
      return { preview: true, message: 'Tool call preview (not executed)' };
    }

    try {
      // Execute the tool
      const result = await this.client.callTool({
        name: toolName,
        arguments: toolArguments,
      });

      const duration = Date.now() - startTime;

      // Emit transport message received event
      const responseMessage = JSON.stringify(result);
      await this.eventEmitter.emit<TransportMessageReceivedPayload>(
        TransportEventType.TRANSPORT_MESSAGE_RECEIVED,
        {
          transport_type: 'stdio',
          message_type: 'tools/call_response',
          size_bytes: Buffer.byteLength(responseMessage, 'utf8'),
        }
      );

      // Extract result content
      const resultContent =
        (result.content as Array<{ type: string; text?: string }>) || [];
      const textContent = resultContent
        .filter((item: { type: string; text?: string }) => item.type === 'text')
        .map((item: { type: string; text?: string }) => item.text || '')
        .join('\n');

      const toolResult = textContent || result;

      // Emit tool execution completed event
      await this.eventEmitter.emit<ToolExecutionCompletedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          result: toolResult,
          execution_id: executionId,
          duration_ms: duration,
        }
      );

      return toolResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Emit tool execution failed event
      await this.eventEmitter.emit<ToolExecutionFailedPayload>(
        ToolExecutionEventType.TOOL_EXECUTION_FAILED,
        {
          tool_name: toolName,
          arguments: toolArguments,
          execution_id: executionId,
          error: {
            message: errorMessage,
            code: 'TOOL_EXECUTION_ERROR',
            stack_trace: errorStack,
            error_type: 'runtime',
          },
          duration_ms: duration,
        }
      );

      // Emit transport error event
      await this.eventEmitter.emit<TransportErrorPayload>(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'stdio',
          error_message: errorMessage,
          error_code: 'TOOL_EXECUTION_ERROR',
          recoverable: true,
        }
      );

      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
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
