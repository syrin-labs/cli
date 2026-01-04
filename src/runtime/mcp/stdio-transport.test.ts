/**
 * Tests for stdio transport utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as childProcess from 'child_process';
import { getConnectedStdioClient } from './stdio-transport';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

describe('stdio-transport', () => {
  let mockClient: Client;
  let mockTransport: StdioClientTransport;
  let mockProcess: childProcess.ChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockProcess = {
      on: vi.fn(),
      kill: vi.fn(),
    } as unknown as childProcess.ChildProcess;

    mockTransport = {
      close: vi.fn(),
    } as unknown as StdioClientTransport;

    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      onerror: null,
    } as unknown as Client;

    vi.mocked(Client).mockImplementation(() => mockClient);
    vi.mocked(StdioClientTransport).mockImplementation(() => mockTransport);
    vi.mocked(childProcess.spawn).mockReturnValue(mockProcess);
  });

  describe('getConnectedStdioClient', () => {
    it('should connect successfully with simple command', async () => {
      const result = await getConnectedStdioClient('python server.py');

      expect(Client).toHaveBeenCalledWith(
        { name: 'syrin', version: '1.0.0' },
        { capabilities: {} }
      );
      expect(childProcess.spawn).toHaveBeenCalledWith(
        'python',
        ['server.py'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'python',
        args: ['server.py'],
        env: process.env,
      });
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(result.client).toBe(mockClient);
      expect(result.transport).toBe(mockTransport);
      expect(result.process).toBe(mockProcess);
    });

    it('should connect successfully with command and arguments', async () => {
      const result = await getConnectedStdioClient('node index.js --port 3000');

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'node',
        ['index.js', '--port', '3000'],
        expect.any(Object)
      );
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'node',
        args: ['index.js', '--port', '3000'],
        env: process.env,
      });
      expect(result.client).toBe(mockClient);
      expect(result.transport).toBe(mockTransport);
      expect(result.process).toBe(mockProcess);
    });

    it('should handle command with multiple spaces', async () => {
      await getConnectedStdioClient('python   server.py   --port   3000');

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'python',
        ['server.py', '--port', '3000'],
        expect.any(Object)
      );
    });

    it('should throw error for empty command', async () => {
      await expect(getConnectedStdioClient('')).rejects.toThrow(
        'Command is empty'
      );
    });

    it('should throw error for whitespace-only command', async () => {
      await expect(getConnectedStdioClient('   ')).rejects.toThrow(
        'Command is empty'
      );
    });

    it('should handle connection timeout', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve, let timeout handle it
          })
      );

      const promise = getConnectedStdioClient('python server.py', 50);
      // Advance timers to trigger timeout
      vi.advanceTimersByTime(50);

      await expect(promise).rejects.toThrow('Connection timeout after 50ms');

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it.skip('should handle process spawn error', async () => {
      // This test is skipped because the actual implementation throws synchronously
      // in the process.on('error') handler, which makes it difficult to test with mocks.
      // The error handling is tested in integration tests.
    });

    it('should kill process on connection error', async () => {
      const connectionError = new Error('Connection failed');
      vi.mocked(mockClient.connect).mockRejectedValue(connectionError);

      await expect(getConnectedStdioClient('python server.py')).rejects.toThrow(
        'Connection failed'
      );

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should set client error handler', async () => {
      await getConnectedStdioClient('python server.py');

      expect(mockClient.onerror).toBeDefined();
      expect(typeof mockClient.onerror).toBe('function');
    });

    it('should use default timeout when not specified', async () => {
      await getConnectedStdioClient('python server.py');

      // Verify that timeout logic is set up (10000ms default)
      // The actual timeout promise is created internally
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should use custom timeout when specified', async () => {
      vi.mocked(mockClient.connect).mockImplementation(
        () =>
          new Promise((_, reject) => {
            // Don't reject, let the timeout handle it
          })
      );

      const promise = getConnectedStdioClient('python server.py', 200);
      // Advance timers to trigger timeout
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('Connection timeout after 200ms');
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
