/**
 * Tests for MCP connection utilities.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  connectHTTP,
  connectStdio,
  connectMCP,
  getConnectedClient,
  getConnectedStdioClient,
} from './connection';
import { ConfigurationError } from '@/utils/errors';
import { getCurrentVersion } from '@/utils/version-checker';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  const Client = vi.fn();
  return { Client };
});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  const StreamableHTTPClientTransport = vi.fn();
  return { StreamableHTTPClientTransport };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  const StdioClientTransport = vi.fn();
  return { StdioClientTransport };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-session-id'),
}));

describe('connection utilities', () => {
  let mockClient: Client;
  let mockHTTPTransport: StreamableHTTPClientTransport;
  let mockStdioTransport: StdioClientTransport;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockHTTPTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      sessionId: 'test-session-id',
    } as unknown as StreamableHTTPClientTransport;

    mockStdioTransport = {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as StdioClientTransport;

    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      getServerCapabilities: vi.fn().mockReturnValue({
        tools: {},
        resources: {},
      }),
      onerror: null,
    } as unknown as Client;

    vi.mocked(Client).mockImplementation(function ClientMock() {
      return mockClient;
    });
    vi.mocked(StreamableHTTPClientTransport).mockImplementation(
      function StreamableHTTPClientTransportMock() {
        return mockHTTPTransport;
      }
    );
    vi.mocked(StdioClientTransport).mockImplementation(
      function StdioClientTransportMock() {
        return mockStdioTransport;
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getConnectedClient', () => {
    it('should return connected client and transport', async () => {
      const result = await getConnectedClient('http://localhost:3000');

      expect(Client).toHaveBeenCalledWith(
        { name: 'syrin', version: getCurrentVersion() },
        { capabilities: {} }
      );
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        { requestInit: undefined }
      );
      expect(mockClient.connect).toHaveBeenCalledWith(mockHTTPTransport);
      expect(result.client).toBe(mockClient);
      expect(result.transport).toBe(mockHTTPTransport);
    });

    it('should pass headers to transport when provided', async () => {
      const headers = { Authorization: 'Bearer token123' };
      await getConnectedClient('http://localhost:3000', headers);

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        {
          requestInit: {
            headers,
          },
        }
      );
    });

    it('should set client error handler', async () => {
      await getConnectedClient('http://localhost:3000');

      expect(mockClient.onerror).toBeDefined();
      expect(typeof mockClient.onerror).toBe('function');
    });

    it('should handle connection timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
      );

      const promise = getConnectedClient(
        'http://localhost:3000',
        undefined,
        100
      );

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(100);

      // Wait for the rejection
      await expect(promise).rejects.toThrow('Connection timeout after 100ms');

      // Clean up any remaining timers
      vi.runAllTimers();
    });

    it('should handle invalid URL', async () => {
      await expect(getConnectedClient('invalid-url')).rejects.toThrow();
    });
  });

  describe('connectHTTP', () => {
    it('should connect successfully', async () => {
      const result = await connectHTTP('http://localhost:3000');

      expect(result.success).toBe(true);
      expect(result.transport).toBe('http');
      expect(result.details?.mcpUrl).toBe('http://localhost:3000');
      expect(result.details?.protocolVersion).toBe('2024-11-05');
      expect(result.details?.capabilities).toBeDefined();
      expect(mockHTTPTransport.close).toHaveBeenCalled();
    });

    it('should pass headers to transport when provided', async () => {
      const headers = { Authorization: 'Bearer token123' };
      await connectHTTP('http://localhost:3000', headers);

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        {
          requestInit: {
            headers,
          },
        }
      );
    });

    it('should include session ID in details when available', async () => {
      const result = await connectHTTP('http://localhost:3000');

      expect(result.details?.sessionId).toBe('test-session-id');
      expect(result.details?.metadata?.sessionId).toBe('test-session-id');
    });

    it('should include initialize request/response details', async () => {
      const result = await connectHTTP('http://localhost:3000');

      expect(result.details?.initializeRequest).toMatchObject({
        method: 'POST',
        url: 'http://localhost:3000',
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          jsonrpc: '2.0',
          method: 'initialize',
        }),
      });

      expect(result.details?.initializeResponse).toMatchObject({
        statusCode: 200,
        body: expect.objectContaining({
          jsonrpc: '2.0',
          result: expect.any(Object),
        }),
      });
    });

    it('should handle connection timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
      );

      const promise = connectHTTP('http://localhost:3000', undefined, 100);

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(100);

      const result = await promise;

      // Clean up any remaining timers
      vi.runAllTimers();

      expect(result.success).toBe(false);
      expect(result.transport).toBe('http');
      expect(result.error).toContain('timeout');
      // Note: close might not be called in timeout case as the error is caught before cleanup
    });

    it('should handle connection errors', async () => {
      const error = new Error('ECONNREFUSED');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectHTTP('http://localhost:3000');

      expect(result.success).toBe(false);
      expect(result.transport).toBe('http');
      expect(result.error).toContain('Cannot connect to MCP server');
      expect(mockHTTPTransport.close).toHaveBeenCalled();
    });

    it('should handle 401 Unauthorized errors', async () => {
      const error = new Error('401 Unauthorized');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectHTTP('http://localhost:3000');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('should handle 404 Not Found errors', async () => {
      const error = new Error('404');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectHTTP('http://localhost:3000');

      expect(result.success).toBe(false);
      expect(result.error).toContain('MCP endpoint not found');
    });

    it('should handle network errors', async () => {
      const error = new Error('fetch failed');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectHTTP('http://localhost:3000');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot connect to MCP server');
    });

    it('should include discovery URL in error details', async () => {
      const error = new Error('Connection failed');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectHTTP('http://localhost:3000');

      expect(result.details?.discoveryUrl).toBe(
        'http://localhost:3000/.well-known/mcp'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(mockHTTPTransport.close).mockRejectedValue(
        new Error('Close failed')
      );

      const result = await connectHTTP('http://localhost:3000');

      // Should still return success if connection was successful
      expect(result.success).toBe(true);
    });
  });

  describe('getConnectedStdioClient', () => {
    it('should return connected client and transport', async () => {
      const result = await getConnectedStdioClient('python server.py');

      expect(Client).toHaveBeenCalledWith(
        { name: 'syrin', version: getCurrentVersion() },
        { capabilities: {} }
      );
      // Check that env was passed (filtered process.env)
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'python',
        args: ['server.py'],
        env: expect.objectContaining({}),
      });
      expect(mockClient.connect).toHaveBeenCalledWith(mockStdioTransport);
      expect(result.client).toBe(mockClient);
      expect(result.transport).toBe(mockStdioTransport);
    });

    it('should parse command with arguments', async () => {
      await getConnectedStdioClient('node index.js --port 3000');

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'node',
        args: ['index.js', '--port', '3000'],
        env: expect.objectContaining({}),
      });
    });

    it('should merge provided env vars with process.env', async () => {
      const customEnv = { API_KEY: 'test-key', CUSTOM_VAR: 'custom-value' };
      await getConnectedStdioClient('python server.py', customEnv);

      const callArgs = vi.mocked(StdioClientTransport).mock.calls[0][0];
      expect(callArgs.env).toMatchObject(customEnv);
      // Should also include process.env vars
      expect(callArgs.env).toHaveProperty('PATH');
    });

    it('should throw error for empty command', async () => {
      await expect(getConnectedStdioClient('')).rejects.toThrow(
        'Command is empty'
      );
    });

    it('should handle connection timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
      );

      const promise = getConnectedStdioClient(
        'python server.py',
        undefined,
        100
      );

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(100);

      // Wait for the rejection
      await expect(promise).rejects.toThrow('Connection timeout after 100ms');

      // Clean up any remaining timers
      vi.runAllTimers();
    });
  });

  describe('connectStdio', () => {
    it('should connect successfully', async () => {
      const result = await connectStdio('python server.py');

      expect(result.success).toBe(true);
      expect(result.transport).toBe('stdio');
      expect(result.details?.command).toBe('python server.py');
      expect(result.details?.protocolVersion).toBe('2024-11-05');
      expect(result.details?.sessionId).toBe('test-session-id');
      expect(result.details?.capabilities).toBeDefined();
      expect(mockStdioTransport.close).toHaveBeenCalled();
    });

    it('should merge provided env vars with process.env', async () => {
      const customEnv = { API_KEY: 'test-key' };
      const result = await connectStdio('python server.py', customEnv);

      expect(result.success).toBe(true);
      const callArgs = vi.mocked(StdioClientTransport).mock.calls[0][0];
      expect(callArgs.env).toMatchObject(customEnv);
    });

    it('should return error for empty command', async () => {
      const result = await connectStdio('');

      expect(result.success).toBe(false);
      expect(result.transport).toBe('stdio');
      expect(result.error).toBe('Command is empty');
    });

    it('should handle connection timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
      );

      const promise = connectStdio('python server.py', undefined, 100);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      await vi.runAllTimersAsync();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(mockStdioTransport.close).toHaveBeenCalled();
    });

    it('should handle ENOENT errors', async () => {
      const error = new Error('ENOENT: command not found');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectStdio('nonexistent command');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in PATH');
    });

    it('should handle permission denied errors', async () => {
      const error = new Error('EACCES: permission denied');
      vi.mocked(mockClient.connect).mockRejectedValue(error);

      const result = await connectStdio('python server.py');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(mockStdioTransport.close).mockRejectedValue(
        new Error('Close failed')
      );

      const result = await connectStdio('python server.py');

      // Should still return success if connection was successful
      expect(result.success).toBe(true);
    });
  });

  describe('connectMCP', () => {
    it('should connect via HTTP transport', async () => {
      const result = await connectMCP({
        transport: 'http',
        url: 'http://localhost:3000',
      });

      expect(result.success).toBe(true);
      expect(result.transport).toBe('http');
    });

    it('should pass headers to HTTP transport', async () => {
      const headers = { Authorization: 'Bearer token123' };
      await connectMCP({
        transport: 'http',
        url: 'http://localhost:3000',
        headers,
      });

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        {
          requestInit: {
            headers,
          },
        }
      );
    });

    it('should connect via stdio transport', async () => {
      const result = await connectMCP({
        transport: 'stdio',
        command: 'python server.py',
      });

      expect(result.success).toBe(true);
      expect(result.transport).toBe('stdio');
    });

    it('should pass env vars to stdio transport', async () => {
      const env = { API_KEY: 'test-key' };
      await connectMCP({
        transport: 'stdio',
        command: 'python server.py',
        env,
      });

      const callArgs = vi.mocked(StdioClientTransport).mock.calls[0][0];
      expect(callArgs.env).toMatchObject(env);
    });

    it('should throw ConfigurationError for HTTP without URL', async () => {
      await expect(
        connectMCP({
          transport: 'http',
        })
      ).rejects.toThrow(ConfigurationError);
      await expect(
        connectMCP({
          transport: 'http',
        })
      ).rejects.toThrow('MCP URL is required for HTTP transport');
    });

    it('should throw ConfigurationError for stdio without command', async () => {
      await expect(
        connectMCP({
          transport: 'stdio',
        })
      ).rejects.toThrow(ConfigurationError);
      await expect(
        connectMCP({
          transport: 'stdio',
        })
      ).rejects.toThrow('Command is required for stdio transport');
    });

    it('should throw ConfigurationError for unsupported transport', async () => {
      await expect(
        connectMCP({
          transport: 'websocket' as any,
        })
      ).rejects.toThrow(ConfigurationError);
      await expect(
        connectMCP({
          transport: 'websocket' as any,
        })
      ).rejects.toThrow('Unsupported transport type');
    });

    it('should use custom timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
      );

      const promise = connectMCP({
        transport: 'http',
        url: 'http://localhost:3000',
        timeout: 100,
      });
      vi.advanceTimersByTime(100);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });
});
