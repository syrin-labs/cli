/**
 * Tests for MCP listing utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  listTools,
  listResources,
  listPrompts,
  closeConnection,
} from './list';
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('list utilities', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      listTools: vi.fn(),
      listResources: vi.fn(),
      listPrompts: vi.fn(),
    } as unknown as Client;
  });

  describe('listTools', () => {
    it('should list tools successfully', async () => {
      const mockTools = [
        {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'string' },
        },
      ];

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: mockTools,
      } as any);

      const result = await listTools(mockClient);

      expect(result.tools).toEqual(mockTools);
      expect(mockClient.listTools).toHaveBeenCalledOnce();
    });

    it('should handle empty tools list', async () => {
      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: [],
      } as any);

      const result = await listTools(mockClient);

      expect(result.tools).toEqual([]);
    });

    it('should handle tools with minimal fields', async () => {
      const mockTools = [
        {
          name: 'minimal_tool',
        },
      ];

      vi.mocked(mockClient.listTools).mockResolvedValue({
        tools: mockTools,
      } as any);

      const result = await listTools(mockClient);

      expect(result.tools).toEqual(mockTools);
    });

    it('should handle missing tools property', async () => {
      vi.mocked(mockClient.listTools).mockResolvedValue({} as any);

      const result = await listTools(mockClient);

      expect(result.tools).toEqual([]);
    });

    it('should throw error on listTools failure', async () => {
      const error = new Error('Connection failed');
      vi.mocked(mockClient.listTools).mockRejectedValue(error);

      await expect(listTools(mockClient)).rejects.toThrow(
        'Failed to list tools: Connection failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockClient.listTools).mockRejectedValue('String error');

      await expect(listTools(mockClient)).rejects.toThrow(
        'Failed to list tools: String error'
      );
    });
  });

  describe('listResources', () => {
    it('should list resources successfully', async () => {
      const mockResources = [
        {
          uri: 'file:///path/to/resource',
          name: 'Test Resource',
          description: 'A test resource',
          mimeType: 'text/plain',
        },
      ];

      vi.mocked(mockClient.listResources).mockResolvedValue({
        resources: mockResources,
      } as any);

      const result = await listResources(mockClient);

      expect(result.resources).toEqual(mockResources);
      expect(mockClient.listResources).toHaveBeenCalledOnce();
    });

    it('should handle empty resources list', async () => {
      vi.mocked(mockClient.listResources).mockResolvedValue({
        resources: [],
      } as any);

      const result = await listResources(mockClient);

      expect(result.resources).toEqual([]);
    });

    it('should handle resources with minimal fields', async () => {
      const mockResources = [
        {
          uri: 'file:///path/to/resource',
        },
      ];

      vi.mocked(mockClient.listResources).mockResolvedValue({
        resources: mockResources,
      } as any);

      const result = await listResources(mockClient);

      expect(result.resources).toEqual(mockResources);
    });

    it('should handle missing resources property', async () => {
      vi.mocked(mockClient.listResources).mockResolvedValue({} as any);

      const result = await listResources(mockClient);

      expect(result.resources).toEqual([]);
    });

    it('should throw error on listResources failure', async () => {
      const error = new Error('Connection failed');
      vi.mocked(mockClient.listResources).mockRejectedValue(error);

      await expect(listResources(mockClient)).rejects.toThrow(
        'Failed to list resources: Connection failed'
      );
    });
  });

  describe('listPrompts', () => {
    it('should list prompts successfully', async () => {
      const mockPrompts = [
        {
          name: 'test_prompt',
          title: 'Test Prompt',
          description: 'A test prompt',
          arguments: [
            {
              name: 'arg1',
              description: 'First argument',
              required: true,
            },
          ],
        },
      ];

      vi.mocked(mockClient.listPrompts).mockResolvedValue({
        prompts: mockPrompts,
      } as any);

      const result = await listPrompts(mockClient);

      expect(result.prompts).toEqual(mockPrompts);
      expect(mockClient.listPrompts).toHaveBeenCalledOnce();
    });

    it('should handle empty prompts list', async () => {
      vi.mocked(mockClient.listPrompts).mockResolvedValue({
        prompts: [],
      } as any);

      const result = await listPrompts(mockClient);

      expect(result.prompts).toEqual([]);
    });

    it('should handle prompts with minimal fields', async () => {
      const mockPrompts = [
        {
          name: 'minimal_prompt',
        },
      ];

      vi.mocked(mockClient.listPrompts).mockResolvedValue({
        prompts: mockPrompts,
      } as any);

      const result = await listPrompts(mockClient);

      expect(result.prompts).toEqual(mockPrompts);
    });

    it('should handle missing prompts property', async () => {
      vi.mocked(mockClient.listPrompts).mockResolvedValue({} as any);

      const result = await listPrompts(mockClient);

      expect(result.prompts).toEqual([]);
    });

    it('should throw error on listPrompts failure', async () => {
      const error = new Error('Connection failed');
      vi.mocked(mockClient.listPrompts).mockRejectedValue(error);

      await expect(listPrompts(mockClient)).rejects.toThrow(
        'Failed to list prompts: Connection failed'
      );
    });
  });

  describe('closeConnection', () => {
    it('should close StreamableHTTPClientTransport successfully', async () => {
      const mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as StreamableHTTPClientTransport;

      await closeConnection(mockTransport);

      expect(mockTransport.close).toHaveBeenCalledOnce();
    });

    it('should close StdioClientTransport successfully', async () => {
      const mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as StdioClientTransport;

      await closeConnection(mockTransport);

      expect(mockTransport.close).toHaveBeenCalledOnce();
    });

    it('should handle close errors gracefully', async () => {
      const mockTransport = {
        close: vi.fn().mockRejectedValue(new Error('Close failed')),
      } as unknown as StreamableHTTPClientTransport;

      // Should not throw
      await expect(closeConnection(mockTransport)).resolves.toBeUndefined();
    });

    it('should handle missing close method', async () => {
      const mockTransport = {} as unknown as StreamableHTTPClientTransport;

      // Should not throw
      await expect(closeConnection(mockTransport)).resolves.toBeUndefined();
    });
  });
});
