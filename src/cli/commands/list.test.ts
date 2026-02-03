/**
 * Tests for `syrin list` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeList } from './list';
import { listTools, listResources, listPrompts } from '@/runtime/mcp';
import {
  resolveTransportConfig,
  establishConnection,
  safeCloseConnection,
} from '@/cli/utils';
import { ListTypes, TransportTypes } from '@/constants';

/** Stable test-only URL (mocked; no real external dependency). */
const TEST_MCP_URL = 'http://test-mcp.example/mcp';

// Mock dependencies
vi.mock('@/runtime/mcp');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    resolveTransportConfig: vi.fn(),
    establishConnection: vi.fn(),
    safeCloseConnection: vi.fn(),
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
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    plain: vi.fn(),
    blank: vi.fn(),
    heading: vi.fn(),
    label: vi.fn(),
    value: vi.fn(),
    labelValue: vi.fn(),
    numberedItem: vi.fn(),
    checkmark: vi.fn(),
    xmark: vi.fn(),
    warnSymbol: vi.fn(),
    tick: vi.fn(() => '✓'),
    cross: vi.fn(() => '✗'),
    styleText: vi.fn(text => text),
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
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
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

      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      await executeList({});

      expect(resolveTransportConfig).toHaveBeenCalled();
      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });
      expect(listTools).toHaveBeenCalledWith(mockClient);
      expect(safeCloseConnection).toHaveBeenCalledWith(mockTransport);
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

      vi.mocked(establishConnection).mockResolvedValue({
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

      vi.mocked(establishConnection).mockResolvedValue({
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
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({ transport: TransportTypes.HTTP });

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });
    });

    it('should always close connection even if listing fails', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockRejectedValue(new Error('List failed'));

      await expect(executeList({})).rejects.toThrow('List failed');

      expect(safeCloseConnection).toHaveBeenCalledWith(mockTransport);
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

      vi.mocked(establishConnection).mockRejectedValue(
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

      vi.mocked(establishConnection).mockRejectedValue(
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

      vi.mocked(establishConnection).mockRejectedValue(
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
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
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
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
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

    it('should succeed with --url only (zero-config: no syrin.yaml required)', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: TEST_MCP_URL,
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({
        type: ListTypes.TOOLS,
        url: TEST_MCP_URL,
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        type: ListTypes.TOOLS,
        url: TEST_MCP_URL,
      });
      expect(establishConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: TransportTypes.HTTP,
          url: TEST_MCP_URL,
        })
      );
    });

    it('should pass env vars to stdio transport', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const env = { API_KEY: 'test-key' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({ env });

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env,
        authHeaders: undefined,
      });
    });

    it('should pass auth headers to HTTP transport', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const authHeaders = { Authorization: 'Bearer token123' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(listTools).mockResolvedValue({ tools: [] });

      await executeList({ authHeaders });

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders,
      });
    });
  });
});
