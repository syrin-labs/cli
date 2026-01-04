/**
 * Tests for BaseMCPClientManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { BaseMCPClientManager } from './base';
import type { EventEmitter } from '@/events/emitter';
import {
  TransportEventType,
  ToolExecutionEventType,
} from '@/events/event-type';
import { ConfigurationError } from '@/utils/errors';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

describe('BaseMCPClientManager', () => {
  let mockEventEmitter: EventEmitter;
  let mockClient: Client;
  let manager: BaseMCPClientManager;

  // Create a concrete implementation for testing
  class TestMCPClientManager extends BaseMCPClientManager {
    getTransportType() {
      return 'http' as const;
    }

    // Expose protected methods for testing
    async testEmitTransportError(
      errorMessage: string,
      errorCode: string,
      recoverable: boolean
    ) {
      return this.emitTransportError(errorMessage, errorCode, recoverable);
    }

    // Set client and connected state for testing
    setClient(client: Client | null) {
      this['client'] = client;
    }

    setConnected(connected: boolean) {
      this['connected'] = connected;
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventEmitter = {
      emit: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventEmitter;

    mockClient = {
      listTools: vi.fn(),
      callTool: vi.fn(),
    } as unknown as Client;

    manager = new TestMCPClientManager(mockEventEmitter);
  });

  describe('getAvailableTools', () => {
    it('should return available tools when connected', async () => {
      const mockTools = [
        {
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object' },
        },
      ];

      manager.setClient(mockClient);
      manager.setConnected(true);

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: mockTools,
      } as any);

      const result = await manager.getAvailableTools();

      expect(result).toEqual([
        {
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object' },
        },
      ]);
      expect(mockClient.listTools).toHaveBeenCalledOnce();
    });

    it('should throw ConfigurationError when not connected', async () => {
      manager.setClient(null);
      manager.setConnected(false);

      await expect(manager.getAvailableTools()).rejects.toThrow(
        ConfigurationError
      );
      await expect(manager.getAvailableTools()).rejects.toThrow(
        'MCP client is not connected'
      );
    });

    it('should handle tools with missing description', async () => {
      const mockTools = [
        {
          name: 'test_tool',
          inputSchema: { type: 'object' },
        },
      ];

      manager.setClient(mockClient);
      manager.setConnected(true);

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: mockTools,
      } as any);

      const result = await manager.getAvailableTools();

      expect(result[0]?.description).toBe('');
    });

    it('should handle tools with missing inputSchema', async () => {
      const mockTools = [
        {
          name: 'test_tool',
          description: 'Test tool',
        },
      ];

      manager.setClient(mockClient);
      manager.setConnected(true);

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: mockTools,
      } as any);

      const result = await manager.getAvailableTools();

      expect(result[0]?.inputSchema).toEqual({});
    });

    it('should handle empty tools list', async () => {
      manager.setClient(mockClient);
      manager.setConnected(true);

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: [],
      } as any);

      const result = await manager.getAvailableTools();

      expect(result).toEqual([]);
    });

    it('should emit transport error and throw on listTools failure', async () => {
      manager.setClient(mockClient);
      manager.setConnected(true);

      const error = new Error('Connection failed');
      vi.mocked(mockClient.listTools).mockRejectedValue(error);

      await expect(manager.getAvailableTools()).rejects.toThrow(
        'Failed to list tools: Connection failed'
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        TransportEventType.TRANSPORT_ERROR,
        expect.objectContaining({
          transport_type: 'http',
          error_message: 'Failed to list tools: Connection failed',
          error_code: 'LIST_TOOLS_ERROR',
          recoverable: true,
        })
      );
    });
  });

  describe('executeTool', () => {
    beforeEach(() => {
      manager.setClient(mockClient);
      manager.setConnected(true);
    });

    it('should execute tool successfully in execution mode', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Tool result' }],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockResult as any);

      const result = await manager.executeTool(
        'test_tool',
        { arg1: 'value1' },
        true
      );

      expect(result).toBe('Tool result');
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'test_tool',
        arguments: { arg1: 'value1' },
      });

      // Verify events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        expect.objectContaining({
          tool_name: 'test_tool',
          arguments: { arg1: 'value1' },
          execution_id: 'test-uuid-123',
        })
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        TransportEventType.TRANSPORT_MESSAGE_SENT,
        expect.objectContaining({
          transport_type: 'http',
          message_type: 'tools/call',
          tool_name: 'test_tool',
          tool_arguments: { arg1: 'value1' },
        })
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        TransportEventType.TRANSPORT_MESSAGE_RECEIVED,
        expect.objectContaining({
          transport_type: 'http',
          message_type: 'tools/call_response',
        })
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        expect.objectContaining({
          tool_name: 'test_tool',
          arguments: { arg1: 'value1' },
          result: 'Tool result',
          execution_id: 'test-uuid-123',
        })
      );
    });

    it('should return preview in preview mode', async () => {
      const result = await manager.executeTool(
        'test_tool',
        { arg1: 'value1' },
        false
      );

      expect(result).toEqual({
        preview: true,
        message: 'Tool call preview (not executed)',
      });
      expect(mockClient.callTool).not.toHaveBeenCalled();

      // Verify preview events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        expect.any(Object)
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        expect.objectContaining({
          result: {
            preview: true,
            message: 'Tool call preview (not executed)',
          },
        })
      );
    });

    it('should handle result with multiple text content items', async () => {
      const mockResult = {
        content: [
          { type: 'text', text: 'Result 1' },
          { type: 'text', text: 'Result 2' },
        ],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockResult as any);

      const result = await manager.executeTool('test_tool', {}, true);

      expect(result).toBe('Result 1\nResult 2');
    });

    it('should handle result with non-text content', async () => {
      const mockResult = {
        content: [{ type: 'image', data: 'base64data' }],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockResult as any);

      const result = await manager.executeTool('test_tool', {}, true);

      expect(result).toBe(mockResult);
    });

    it('should handle result without content', async () => {
      const mockResult = {};

      vi.mocked(mockClient.callTool).mockResolvedValue(mockResult as any);

      const result = await manager.executeTool('test_tool', {}, true);

      expect(result).toBe(mockResult);
    });

    it('should throw ConfigurationError when not connected', async () => {
      manager.setClient(null);
      manager.setConnected(false);

      await expect(
        manager.executeTool('test_tool', {}, true)
      ).rejects.toThrow(ConfigurationError);
      await expect(
        manager.executeTool('test_tool', {}, true)
      ).rejects.toThrow('MCP client is not connected');
    });

    it('should emit error events on tool execution failure', async () => {
      const error = new Error('Tool execution failed');
      vi.mocked(mockClient.callTool).mockRejectedValue(error);

      await expect(
        manager.executeTool('test_tool', { arg1: 'value1' }, true)
      ).rejects.toThrow('Tool execution failed: Tool execution failed');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ToolExecutionEventType.TOOL_EXECUTION_FAILED,
        expect.objectContaining({
          tool_name: 'test_tool',
          arguments: { arg1: 'value1' },
          execution_id: 'test-uuid-123',
          error: expect.objectContaining({
            message: 'Tool execution failed',
            code: 'TOOL_EXECUTION_ERROR',
            error_type: 'runtime',
          }),
        })
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        TransportEventType.TRANSPORT_ERROR,
        expect.objectContaining({
          transport_type: 'http',
          error_message: 'Tool execution failed',
          error_code: 'TOOL_EXECUTION_ERROR',
          recoverable: true,
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockClient.callTool).mockRejectedValue('String error');

      await expect(
        manager.executeTool('test_tool', {}, true)
      ).rejects.toThrow('Tool execution failed: String error');
    });

    it('should calculate execution duration', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Result' }],
      };

      vi.mocked(mockClient.callTool).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(mockResult as any), 50);
          })
      );

      await manager.executeTool('test_tool', {}, true);

      const completedCall = vi
        .mocked(mockEventEmitter.emit)
        .mock.calls.find(
          call =>
            call[0] === ToolExecutionEventType.TOOL_EXECUTION_COMPLETED
        );

      expect(completedCall?.[1]).toMatchObject({
        duration_ms: expect.any(Number),
      });
      expect((completedCall?.[1] as any).duration_ms).toBeGreaterThanOrEqual(
        50
      );
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      manager.setConnected(false);
      expect(manager.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      manager.setConnected(true);
      expect(manager.isConnected()).toBe(true);
    });
  });

  describe('emitTransportError', () => {
    it('should emit transport error event', async () => {
      const testManager = manager as TestMCPClientManager;
      await testManager.testEmitTransportError(
        'Test error',
        'TEST_ERROR',
        false
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        TransportEventType.TRANSPORT_ERROR,
        {
          transport_type: 'http',
          error_message: 'Test error',
          error_code: 'TEST_ERROR',
          recoverable: false,
        }
      );
    });
  });
});
