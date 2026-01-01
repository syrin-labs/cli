/**
 * Base MCP client manager with shared functionality.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { EventEmitter } from '@/events/emitter';
import {
  TransportEventType,
  ToolExecutionEventType,
} from '@/events/event-type';
import type {
  TransportMessageSentPayload,
  TransportMessageReceivedPayload,
  TransportErrorPayload,
} from '@/events/payloads/transport';
import type {
  ToolExecutionStartedPayload,
  ToolExecutionCompletedPayload,
  ToolExecutionFailedPayload,
} from '@/events/payloads/tool';
import { ConfigurationError } from '@/utils/errors';
import type { TransportType } from '@/config/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for MCP client managers with shared functionality.
 */
export abstract class BaseMCPClientManager {
  protected client: Client | null = null;
  protected connected: boolean = false;

  constructor(protected readonly eventEmitter: EventEmitter) {}

  /**
   * Get available tools from the MCP server.
   */
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

      await this.emitTransportError(
        `Failed to list tools: ${errorMessage}`,
        'LIST_TOOLS_ERROR',
        true
      );

      throw new Error(`Failed to list tools: ${errorMessage}`);
    }
  }

  /**
   * Execute a tool call.
   */
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
    // Construct request body from source variables to ensure consistency
    const requestMessage = JSON.stringify({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArguments,
      },
    });

    // Derive tool_name and tool_arguments from the same source variables
    // used to construct request_body to guarantee consistency
    await this.eventEmitter.emit<TransportMessageSentPayload>(
      TransportEventType.TRANSPORT_MESSAGE_SENT,
      {
        transport_type: this.getTransportType(),
        message_type: 'tools/call',
        size_bytes: Buffer.byteLength(requestMessage, 'utf8'),
        tool_name: toolName,
        tool_arguments: toolArguments,
        request_body: requestMessage,
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
          transport_type: this.getTransportType(),
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

      await this.emitTransportError(errorMessage, 'TOOL_EXECUTION_ERROR', true);

      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  }

  /**
   * Check if the manager is connected.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the transport type (must be implemented by subclasses).
   */
  abstract getTransportType(): TransportType;

  /**
   * Helper to emit transport error events.
   */
  protected async emitTransportError(
    errorMessage: string,
    errorCode: string,
    recoverable: boolean
  ): Promise<void> {
    await this.eventEmitter.emit<TransportErrorPayload>(
      TransportEventType.TRANSPORT_ERROR,
      {
        transport_type: this.getTransportType(),
        error_message: errorMessage,
        error_code: errorCode,
        recoverable,
      }
    );
  }
}
