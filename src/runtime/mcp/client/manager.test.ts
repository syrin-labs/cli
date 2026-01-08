/**
 * Tests for MCP Client Manager.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as childProcess from 'child_process';
import {
  HTTPMCPClientManager,
  StdioMCPClientManager,
  createMCPClientManager,
} from './manager';
import { getConnectedClient } from '../connection';
import { parseCommand, setupProcessLogCapture, spawnProcess } from './process';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { EventEmitter } from '@/events/emitter';
import { TransportEventType } from '@/events/event-type';

// Mock dependencies
vi.mock('../connection', () => ({
  getConnectedClient: vi.fn(),
}));

vi.mock('./process', () => ({
  parseCommand: vi.fn(),
  setupProcessLogCapture: vi.fn(),
  spawnProcess: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

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

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('MCP Client Manager', () => {
  let mockEventEmitter: EventEmitter;
  let mockClient: Client;
  let mockHTTPTransport: StreamableHTTPClientTransport;
  let mockStdioTransport: StdioClientTransport;
  let mockProcess: childProcess.ChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockEventEmitter = {
      emit: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventEmitter;

    mockHTTPTransport = {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as StreamableHTTPClientTransport;

    mockStdioTransport = {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as StdioClientTransport;

    mockProcess = {
      on: vi.fn(),
      kill: vi.fn(),
    } as unknown as childProcess.ChildProcess;

    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn(),
      callTool: vi.fn(),
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
    vi.mocked(childProcess.spawn).mockReturnValue(mockProcess);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('HTTPMCPClientManager', () => {
    describe('connect', () => {
      it('should connect successfully without spawning', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        await manager.connect();

        expect(getConnectedClient).toHaveBeenCalledWith(
          'http://localhost:3000',
          undefined,
          10000
        );
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_INITIALIZED,
          expect.objectContaining({
            transport_type: 'http',
            endpoint: 'http://localhost:3000',
          })
        );
        expect(manager.isConnected()).toBe(true);
      });

      it('should spawn server and connect when shouldSpawn is true', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter,
          true,
          'python server.py'
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        const connectPromise = manager.connect();
        vi.advanceTimersByTime(2000);
        await connectPromise;

        expect(spawnProcess).toHaveBeenCalledWith('python', ['server.py']);
        expect(setupProcessLogCapture).toHaveBeenCalledWith(mockProcess);
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_INITIALIZED,
          expect.objectContaining({
            transport_type: 'http',
            endpoint: 'http://localhost:3000',
            command: 'python server.py',
          })
        );
      });

      it('should not connect if already connected', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        await manager.connect();
        vi.clearAllMocks();

        await manager.connect();

        expect(getConnectedClient).not.toHaveBeenCalled();
      });

      it('should handle connection errors', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        const error = new Error('Connection failed');
        vi.mocked(getConnectedClient).mockRejectedValue(error);

        const connectPromise = manager.connect();
        await expect(connectPromise).rejects.toThrow(ConfigurationError);
        await expect(connectPromise).rejects.toThrow(
          'Failed to connect to MCP server'
        );

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            transport_type: 'http',
            error_message: 'Connection failed',
            error_code: 'CONNECTION_FAILED',
            recoverable: true,
          })
        );
      });

      it('should kill spawned process on connection error', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter,
          true,
          'python server.py'
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        const error = new Error('Connection failed');
        vi.mocked(getConnectedClient).mockRejectedValue(error);

        const connectPromise = manager.connect();
        // Advance timers to allow spawn and wait logic
        vi.advanceTimersByTime(2000);
        await expect(connectPromise).rejects.toThrow();

        expect(mockProcess.kill).toHaveBeenCalled();
      });

      it('should handle process errors', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter,
          true,
          'python server.py'
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        vi.mocked(mockProcess.on).mockImplementation((event, handler) => {
          if (event === 'error') {
            setTimeout(() => {
              handler(new Error('Process error'));
            }, 10);
          }
          return mockProcess;
        });
        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        const connectPromise = manager.connect();
        vi.advanceTimersByTime(2000);
        await connectPromise;
        vi.advanceTimersByTime(20);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            error_code: 'SPAWN_ERROR',
            recoverable: false,
          })
        );
      });

      it('should handle process exit with non-zero code', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter,
          true,
          'python server.py'
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        vi.mocked(mockProcess.on).mockImplementation((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => {
              handler(1, null);
            }, 10);
          }
          return mockProcess;
        });
        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        const connectPromise = manager.connect();
        vi.advanceTimersByTime(2000);
        await connectPromise;
        vi.advanceTimersByTime(20);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            error_code: 'SERVER_EXIT',
            recoverable: false,
          })
        );
      });
    });

    describe('disconnect', () => {
      it('should disconnect successfully', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        await manager.connect();
        await manager.disconnect();

        expect(mockHTTPTransport.close).toHaveBeenCalled();
        expect(manager.isConnected()).toBe(false);
      });

      it('should not disconnect if not connected', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        await manager.disconnect();

        expect(mockHTTPTransport.close).not.toHaveBeenCalled();
      });

      it('should handle disconnect errors gracefully', async () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        vi.mocked(getConnectedClient).mockResolvedValue({
          client: mockClient,
          transport: mockHTTPTransport,
        });

        await manager.connect();
        vi.mocked(mockHTTPTransport.close).mockRejectedValue(
          new Error('Close failed')
        );

        await manager.disconnect();

        expect(logger.error).toHaveBeenCalled();
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            error_code: 'DISCONNECT_ERROR',
            recoverable: false,
          })
        );
      });
    });

    describe('getTransportType', () => {
      it('should return http', () => {
        const manager = new HTTPMCPClientManager(
          'http://localhost:3000',
          mockEventEmitter
        );

        expect(manager.getTransportType()).toBe('http');
      });
    });
  });

  describe('StdioMCPClientManager', () => {
    describe('connect', () => {
      it('should connect successfully', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);

        await manager.connect();

        expect(parseCommand).toHaveBeenCalledWith('python server.py');
        expect(spawnProcess).toHaveBeenCalledWith('python', ['server.py']);
        expect(setupProcessLogCapture).toHaveBeenCalledWith(mockProcess);
        expect(Client).toHaveBeenCalledWith(
          { name: 'syrin', version: '1.0.0' },
          { capabilities: {} }
        );
        expect(StdioClientTransport).toHaveBeenCalledWith({
          command: 'python',
          args: ['server.py'],
          env: process.env,
        });
        expect(mockClient.connect).toHaveBeenCalledWith(mockStdioTransport);
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_INITIALIZED,
          expect.objectContaining({
            transport_type: 'stdio',
            command: 'python server.py',
          })
        );
        expect(manager.isConnected()).toBe(true);
      });

      it('should not connect if already connected', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);

        await manager.connect();
        vi.clearAllMocks();

        await manager.connect();

        expect(parseCommand).not.toHaveBeenCalled();
      });

      it('should throw error for empty command', async () => {
        const manager = new StdioMCPClientManager('', mockEventEmitter);

        await expect(manager.connect()).rejects.toThrow(ConfigurationError);
        await expect(manager.connect()).rejects.toThrow('Command is empty');
      });

      it.skip('should handle connection timeout', async () => {
        // This test is skipped because fake timers don't work well with Promise.race
        // The timeout functionality is tested in integration tests
      });

      it('should handle process spawn errors', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        vi.mocked(mockProcess.on).mockImplementation((event, handler) => {
          if (event === 'error') {
            handler(new Error('ENOENT'));
          }
          return mockProcess;
        });

        await expect(manager.connect()).rejects.toThrow(
          'Failed to start process'
        );
      });

      it('should clean up on connection error', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);
        const error = new Error('Connection failed');
        vi.mocked(mockClient.connect).mockRejectedValue(error);

        await expect(manager.connect()).rejects.toThrow(ConfigurationError);

        expect(mockProcess.kill).toHaveBeenCalled();
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            transport_type: 'stdio',
            error_code: 'CONNECTION_FAILED',
            recoverable: true,
          })
        );
      });
    });

    describe('disconnect', () => {
      it('should disconnect successfully', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);

        await manager.connect();
        await manager.disconnect();

        expect(mockStdioTransport.close).toHaveBeenCalled();
        expect(manager.isConnected()).toBe(false);
      });

      it('should handle disconnect errors gracefully', async () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        vi.mocked(parseCommand).mockReturnValue({
          executable: 'python',
          args: ['server.py'],
        });
        vi.mocked(spawnProcess).mockReturnValue(mockProcess);

        await manager.connect();
        vi.mocked(mockStdioTransport.close).mockRejectedValue(
          new Error('Close failed')
        );

        await manager.disconnect();

        expect(logger.error).toHaveBeenCalled();
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          TransportEventType.TRANSPORT_ERROR,
          expect.objectContaining({
            error_code: 'DISCONNECT_ERROR',
            recoverable: false,
          })
        );
      });
    });

    describe('getTransportType', () => {
      it('should return stdio', () => {
        const manager = new StdioMCPClientManager(
          'python server.py',
          mockEventEmitter
        );

        expect(manager.getTransportType()).toBe('stdio');
      });
    });
  });

  describe('createMCPClientManager', () => {
    it('should create HTTPMCPClientManager for http transport', () => {
      const manager = createMCPClientManager(
        'http',
        'http://localhost:3000',
        undefined,
        mockEventEmitter
      );

      expect(manager).toBeInstanceOf(HTTPMCPClientManager);
      expect(manager.getTransportType()).toBe('http');
    });

    it('should create StdioMCPClientManager for stdio transport', () => {
      const manager = createMCPClientManager(
        'stdio',
        undefined,
        'python server.py',
        mockEventEmitter
      );

      expect(manager).toBeInstanceOf(StdioMCPClientManager);
      expect(manager.getTransportType()).toBe('stdio');
    });

    it('should throw ConfigurationError for http without URL', () => {
      let err: Error | undefined;
      try {
        createMCPClientManager('http', undefined, undefined, mockEventEmitter);
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err?.message).toContain('MCP URL is required for HTTP transport');
    });

    it('should throw ConfigurationError for stdio without command', () => {
      let err: Error | undefined;
      try {
        createMCPClientManager('stdio', undefined, undefined, mockEventEmitter);
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err?.message).toContain('Command is required for stdio transport');
    });

    it('should throw ConfigurationError for unsupported transport', () => {
      let err: Error | undefined;
      try {
        createMCPClientManager(
          'websocket' as any,
          undefined,
          undefined,
          mockEventEmitter
        );
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeInstanceOf(ConfigurationError);
      expect(err?.message).toContain('Unsupported transport type');
    });

    it('should pass shouldSpawn to HTTPMCPClientManager', () => {
      const manager = createMCPClientManager(
        'http',
        'http://localhost:3000',
        'python server.py',
        mockEventEmitter,
        true
      );

      expect(manager).toBeInstanceOf(HTTPMCPClientManager);
    });
  });
});
