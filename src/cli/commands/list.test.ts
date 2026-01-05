/**
 * Tests for `syrin list` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeList } from './list';
import {
  getConnectedClient,
  getConnectedStdioClient,
  listTools,
  listResources,
  listPrompts,
  closeConnection,
} from '@/runtime/mcp';
import { resolveTransportConfig } from '@/cli/utils';
import { ListTypes, TransportTypes } from '@/constants';

// Mock dependencies
vi.mock('@/runtime/mcp');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    resolveTransportConfig: vi.fn(),
    handleCommandError: vi.fn(error => {
      throw error;
    }),
  };
});
vi.mock('@/presentation/list-ui', () => ({
  displayTools: vi.fn(),
  displayResources: vi.fn(),
  displayPrompts: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  log: {
    blank: vi.fn(),
    error: vi.fn(),
  },
}));

describe('executeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should list tools by default', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
      });

      vi.mocked(getConnectedStdioClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            inputSchema: {},
          },
        ],
      });

      vi.mocked(closeConnection).mockResolvedValue(undefined);

      await executeList({});

      expect(resolveTransportConfig).toHaveBeenCalled();
      expect(getConnectedStdioClient).toHaveBeenCalledWith('python server.py');
      expect(listTools).toHaveBeenCalledWith(mockClient);
      expect(closeConnection).toHaveBeenCalledWith(mockTransport);
    });

    it('should list resources when type is specified', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
      });

      vi.mocked(getConnectedClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listResources).mockResolvedValue({
        resources: [
          {
            uri: 'test://resource',
            name: 'test-resource',
            description: 'Test resource',
          },
        ],
      });

      await executeList({ type: ListTypes.RESOURCES });

      expect(listResources).toHaveBeenCalledWith(mockClient);
    });

    it('should list prompts when type is specified', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
      });

      vi.mocked(getConnectedStdioClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listPrompts).mockResolvedValue({
        prompts: [
          {
            name: 'test-prompt',
            description: 'Test prompt',
          },
        ],
      });

      await executeList({ type: ListTypes.PROMPTS });

      expect(listPrompts).toHaveBeenCalledWith(mockClient);
    });

    it('should use HTTP transport when specified', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
      });

      vi.mocked(getConnectedClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({ transport: TransportTypes.HTTP });

      expect(getConnectedClient).toHaveBeenCalledWith('http://localhost:8000');
      expect(getConnectedStdioClient).not.toHaveBeenCalled();
    });

    it('should always close connection even if listing fails', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
      });

      vi.mocked(getConnectedStdioClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockRejectedValue(new Error('List failed'));

      await expect(executeList({})).rejects.toThrow('List failed');

      expect(closeConnection).toHaveBeenCalledWith(mockTransport);
    });
  });

  describe('connection error handling', () => {
    it('should handle HTTP connection failures', async () => {
      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
      });

      vi.mocked(getConnectedClient).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      // handleCommandError is mocked to throw the error, so process.exit is not called
      // The error should be thrown as a ConfigurationError
      await expect(executeList({})).rejects.toThrow();
    });

    it('should handle stdio connection failures', async () => {
      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'nonexistent-command',
        urlSource: 'config',
      });

      vi.mocked(getConnectedStdioClient).mockRejectedValue(
        new Error('spawn nonexistent-command ENOENT')
      );

      // handleCommandError is mocked to throw the error, so process.exit is not called
      // The error should be thrown as a ConfigurationError
      await expect(executeList({})).rejects.toThrow();
    });

    it('should handle connection timeouts', async () => {
      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
      });

      vi.mocked(getConnectedClient).mockRejectedValue(
        new Error('Connection timeout')
      );

      // handleCommandError is mocked to throw the error, so process.exit is not called
      // The error should be thrown as a ConfigurationError
      await expect(executeList({})).rejects.toThrow();
    });
  });

  describe('with CLI options', () => {
    it('should use CLI-provided URL over config', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://custom-url:9000',
        script: undefined,
        urlSource: 'cli',
      });

      vi.mocked(getConnectedClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({
        transport: TransportTypes.HTTP,
        url: 'http://custom-url:9000',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://custom-url:9000',
      });
    });

    it('should use CLI-provided script over config', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'custom-script.sh',
        urlSource: 'config',
      });

      vi.mocked(getConnectedStdioClient).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({
        transport: TransportTypes.STDIO,
        script: 'custom-script.sh',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        script: 'custom-script.sh',
      });
    });
  });
});
