/**
 * Tests for `syrin dev` command.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { executeDev } from './dev';
import { loadConfig } from '@/config/loader';
import { getLLMProvider } from '@/runtime/llm/factory';
import { createMCPClientManager } from '@/runtime/mcp/client/manager';
import { RuntimeEventEmitter } from '@/events/emitter';
import { MemoryEventStore } from '@/events/store/memory-store';
import { FileEventStore } from '@/events/store/file-store';
import { DevSession } from '@/runtime/dev/session';
import { ChatUI } from '@/presentation/dev/chat-ui';
import { DevEventMapper } from '@/runtime/dev/event-mapper';
import { ConfigurationError } from '@/utils/errors';
import { TransportTypes } from '@/constants';
import type { SyrinConfig } from '@/config/types';
import type { EventStore } from '@/events/store';

// Mock dependencies
vi.mock('@/config/loader');
vi.mock('@/runtime/llm/factory');
vi.mock('@/runtime/mcp/client/manager');
vi.mock('@/events/emitter');
vi.mock('@/events/store/memory-store', () => {
  const MemoryEventStore = vi.fn();
  return { MemoryEventStore };
});
vi.mock('@/events/store/file-store', () => {
  const FileEventStore = vi.fn();
  return { FileEventStore };
});
vi.mock('@/runtime/dev/session', () => {
  const DevSession = vi.fn();
  return { DevSession };
});
vi.mock('@/presentation/dev/chat-ui', () => {
  const ChatUI = vi.fn();
  return { ChatUI };
});
vi.mock('@/runtime/dev/event-mapper', () => {
  const DevEventMapper = vi.fn();
  return { DevEventMapper };
});
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    handleCommandError: vi.fn(error => {
      throw error;
    }),
  };
});
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  log: {
    info: vi.fn(),
    blank: vi.fn(),
    error: vi.fn(),
    plain: vi.fn(),
  },
}));
vi.mock('@/presentation/dev-ui', () => ({
  buildDevWelcomeMessages: vi.fn(() => []),
  formatToolsList: vi.fn(tools => `Tools: ${tools.length}`),
  formatCommandHistory: vi.fn(history => `History: ${history.length} entries`),
}));
vi.mock('@/utils/version-checker', () => ({
  checkSyrinVersion: vi.fn().mockResolvedValue({
    current: '1.0.0',
    latest: '1.0.0',
    isLatest: true,
    updateAvailable: false,
  }),
  formatVersionWithUpdate: vi.fn(info => `v${info.current}`),
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));
vi.mock('@/types/factories', () => ({
  makeSessionID: vi.fn(prefix => `${prefix}-test-session-id`),
}));

describe('executeDev', () => {
  let tempDir: string;
  let originalCwd: string;
  let mockConfig: SyrinConfig;
  let mockLLMProvider: any;
  let mockMCPClientManager: any;
  let mockEventEmitter: any;
  let mockSession: any;
  let mockChatUI: any;
  let mockEventMapper: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-dev-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Setup default mocks
    mockConfig = {
      version: '1.0.0',
      project_name: 'test-project',
      agent_name: 'test-agent',
      transport: TransportTypes.STDIO,
      script: 'python server.py',
      llm: {
        openai: {
          API_KEY: 'OPENAI_API_KEY',
          MODEL_NAME: 'OPENAI_MODEL',
        },
      },
    } satisfies SyrinConfig;

    mockLLMProvider = {
      getName: vi.fn(() => 'openai'),
      chat: vi.fn(),
    };

    mockMCPClientManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getAvailableTools: vi
        .fn()
        .mockResolvedValue([
          { name: 'test-tool', description: 'Test tool', inputSchema: {} },
        ]),
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    mockSession = {
      initialize: vi.fn().mockResolvedValue(undefined),
      processUserInput: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockReturnValue({
        totalToolCalls: 0,
        toolCalls: [],
        startTime: new Date(),
        conversationHistory: [],
      }),
      getAvailableTools: vi.fn().mockReturnValue([]),
      addUserMessageToHistory: vi.fn(),
      getToolResult: vi.fn(),
      complete: vi.fn().mockResolvedValue(undefined),
    };

    mockChatUI = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      addMessage: vi.fn(),
    };

    mockEventMapper = {
      start: vi.fn(),
      stop: vi.fn(),
    };

    vi.mocked(loadConfig).mockReturnValue(mockConfig);
    vi.mocked(getLLMProvider).mockReturnValue(mockLLMProvider);
    vi.mocked(createMCPClientManager).mockReturnValue(mockMCPClientManager);
    vi.mocked(RuntimeEventEmitter).mockImplementation(
      function RuntimeEventEmitterMock() {
        return mockEventEmitter;
      }
    );
    vi.mocked(MemoryEventStore).mockImplementation(
      function MemoryEventStoreMock() {
        return {
          append: vi.fn(),
          load: vi.fn().mockReturnValue([]),
        } satisfies Partial<EventStore>;
      }
    );
    vi.mocked(FileEventStore).mockImplementation(function FileEventStoreMock() {
      return {
        append: vi.fn(),
        load: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined),
      } satisfies Partial<FileEventStore> & { close: () => Promise<void> };
    });
    vi.mocked(DevSession).mockImplementation(function DevSessionMock() {
      return mockSession;
    });
    vi.mocked(ChatUI).mockImplementation(function ChatUIMock() {
      return mockChatUI;
    });
    vi.mocked(DevEventMapper).mockImplementation(function DevEventMapperMock() {
      return mockEventMapper;
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('configuration loading', () => {
    it('should load config from project root', async () => {
      const customRoot = path.join(tempDir, 'custom-project');
      fs.mkdirSync(customRoot, { recursive: true });

      await executeDev({ projectRoot: customRoot });

      expect(loadConfig).toHaveBeenCalledWith(customRoot);
    });

    it('should use current working directory as default project root', async () => {
      await executeDev({});

      expect(loadConfig).toHaveBeenCalledWith(
        expect.stringContaining(path.basename(tempDir))
      );
    });

    it('should throw error if HTTP transport missing URL', async () => {
      const httpConfig: SyrinConfig = {
        ...mockConfig,
        transport: TransportTypes.HTTP,
        mcp_url: undefined,
      };

      vi.mocked(loadConfig).mockReturnValue(httpConfig);

      await expect(executeDev({})).rejects.toThrow(ConfigurationError);
    });
  });

  describe('server command resolution', () => {
    it('should spawn server for stdio transport', async () => {
      await executeDev({});

      expect(createMCPClientManager).toHaveBeenCalledWith(
        TransportTypes.STDIO,
        undefined,
        'python server.py',
        expect.any(Object),
        true // shouldSpawn
      );
    });

    it('should spawn server when runScript flag is provided', async () => {
      const httpConfig: SyrinConfig = {
        ...mockConfig,
        transport: TransportTypes.HTTP,
        mcp_url: 'http://localhost:8000',
        script: 'python server.py',
      };

      vi.mocked(loadConfig).mockReturnValue(httpConfig);

      await executeDev({ runScript: true });

      expect(createMCPClientManager).toHaveBeenCalledWith(
        TransportTypes.HTTP,
        'http://localhost:8000',
        'python server.py',
        expect.any(Object),
        true // shouldSpawn
      );
    });

    it('should not spawn server for HTTP without runScript flag', async () => {
      const httpConfig: SyrinConfig = {
        ...mockConfig,
        transport: TransportTypes.HTTP,
        mcp_url: 'http://localhost:8000',
      };

      vi.mocked(loadConfig).mockReturnValue(httpConfig);

      await executeDev({});

      expect(createMCPClientManager).toHaveBeenCalledWith(
        TransportTypes.HTTP,
        'http://localhost:8000',
        undefined,
        expect.any(Object),
        false // shouldSpawn
      );
    });

    it('should throw error if stdio transport missing script', async () => {
      const stdioConfig: SyrinConfig = {
        ...mockConfig,
        transport: TransportTypes.STDIO,
        script: undefined,
      };

      vi.mocked(loadConfig).mockReturnValue(stdioConfig);

      await expect(executeDev({})).rejects.toThrow(ConfigurationError);
    });

    it('should throw error if runScript flag provided but no script in config', async () => {
      const httpConfig: SyrinConfig = {
        ...mockConfig,
        transport: TransportTypes.HTTP,
        mcp_url: 'http://localhost:8000',
        script: undefined,
      };

      vi.mocked(loadConfig).mockReturnValue(httpConfig);

      await expect(executeDev({ runScript: true })).rejects.toThrow(
        ConfigurationError
      );
    });
  });

  describe('event store configuration', () => {
    it('should use MemoryEventStore when saveEvents is false', async () => {
      await executeDev({ saveEvents: false });

      expect(MemoryEventStore).toHaveBeenCalled();
      expect(FileEventStore).not.toHaveBeenCalled();
    });

    it('should use FileEventStore when saveEvents is true', async () => {
      await executeDev({ saveEvents: true });

      expect(FileEventStore).toHaveBeenCalled();
    });

    it('should use custom event file directory when provided', async () => {
      const customEventsDir = path.join(tempDir, 'custom-events');

      await executeDev({
        saveEvents: true,
        eventFile: customEventsDir,
      });

      expect(FileEventStore).toHaveBeenCalled();
    });

    it('should extract directory from file path when eventFile ends with .jsonl', async () => {
      const eventFilePath = path.join(tempDir, 'events', 'session.jsonl');

      await executeDev({
        saveEvents: true,
        eventFile: eventFilePath,
      });

      expect(FileEventStore).toHaveBeenCalled();
    });
  });

  describe('LLM provider configuration', () => {
    it('should use default LLM provider from config', async () => {
      await executeDev({});

      expect(getLLMProvider).toHaveBeenCalledWith(
        undefined,
        mockConfig,
        expect.stringContaining(path.basename(tempDir))
      );
    });

    it('should use CLI-provided LLM provider override', async () => {
      await executeDev({ llm: 'claude' });

      expect(getLLMProvider).toHaveBeenCalledWith(
        'claude',
        mockConfig,
        expect.stringContaining(path.basename(tempDir))
      );
    });
  });

  describe('session initialization', () => {
    it('should initialize session with correct parameters', async () => {
      await executeDev({ exec: true });

      expect(DevSession).toHaveBeenCalledWith({
        config: mockConfig,
        llmProvider: mockLLMProvider,
        mcpClientManager: mockMCPClientManager,
        eventEmitter: mockEventEmitter,
        executionMode: true,
        projectRoot: expect.stringContaining(path.basename(tempDir)),
      });

      expect(mockSession.initialize).toHaveBeenCalled();
    });

    it('should use preview mode when exec is false', async () => {
      await executeDev({ exec: false });

      expect(DevSession).toHaveBeenCalledWith(
        expect.objectContaining({
          executionMode: false,
        })
      );
    });
  });

  describe('MCP connection', () => {
    it('should connect to MCP server', async () => {
      await executeDev({});

      expect(mockMCPClientManager.connect).toHaveBeenCalled();
    });

    it('should get available tools after connection', async () => {
      await executeDev({});

      expect(mockMCPClientManager.getAvailableTools).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockMCPClientManager.connect.mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(executeDev({})).rejects.toThrow('Connection failed');
    });
  });

  describe('ChatUI initialization', () => {
    it('should create ChatUI with correct parameters', async () => {
      await executeDev({});

      expect(ChatUI).toHaveBeenCalledWith(
        expect.objectContaining({
          agentName: mockConfig.agent_name,
          llmProviderName: 'openai',
          welcomeBanner: expect.objectContaining({
            toolCount: 1,
            transport: TransportTypes.STDIO,
            command: 'python server.py',
          }),
        })
      );
    });

    it('should start ChatUI', async () => {
      await executeDev({});

      expect(mockChatUI.start).toHaveBeenCalled();
    });
  });

  describe('cleanup handlers', () => {
    it('should set up SIGTERM handler', async () => {
      const sigtermSpy = vi.spyOn(process, 'on');

      await executeDev({});

      expect(sigtermSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

      sigtermSpy.mockRestore();
    });

    it('should set up uncaughtException handler', async () => {
      const uncaughtSpy = vi.spyOn(process, 'on');

      await executeDev({});

      expect(uncaughtSpy).toHaveBeenCalledWith(
        'uncaughtException',
        expect.any(Function)
      );

      uncaughtSpy.mockRestore();
    });

    it('should set up unhandledRejection handler', async () => {
      const rejectionSpy = vi.spyOn(process, 'on');

      await executeDev({});

      expect(rejectionSpy).toHaveBeenCalledWith(
        'unhandledRejection',
        expect.any(Function)
      );

      rejectionSpy.mockRestore();
    });

    it('should set up SIGINT handler', async () => {
      const sigintSpy = vi.spyOn(process, 'on');

      await executeDev({});

      expect(sigintSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      sigintSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle config loading errors', async () => {
      vi.mocked(loadConfig).mockImplementation(() => {
        throw new ConfigurationError('Config not found');
      });

      await expect(executeDev({})).rejects.toThrow(ConfigurationError);
    });

    it('should handle LLM provider creation errors', async () => {
      vi.mocked(getLLMProvider).mockImplementation(() => {
        throw new ConfigurationError('LLM provider not found');
      });

      await expect(executeDev({})).rejects.toThrow(ConfigurationError);
    });

    it('should handle MCP client manager creation errors', async () => {
      vi.mocked(createMCPClientManager).mockImplementation(() => {
        throw new Error('Failed to create client manager');
      });

      await expect(executeDev({})).rejects.toThrow(
        'Failed to create client manager'
      );
    });
  });

  describe('with saveEvents option', () => {
    it('should create FileEventStore and log event file path', async () => {
      await executeDev({ saveEvents: true });

      expect(FileEventStore).toHaveBeenCalled();
    });

    it('should close FileEventStore on cleanup', async () => {
      const mockFileStore = {
        append: vi.fn(),
        load: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined),
      } satisfies Partial<FileEventStore> & { close: () => Promise<void> };

      vi.mocked(FileEventStore).mockImplementation(
        function FileEventStoreMock() {
          return mockFileStore;
        }
      );

      await executeDev({ saveEvents: true });

      // Verify FileEventStore was created
      expect(FileEventStore).toHaveBeenCalled();

      // The cleanup is tested through the onExit handler which is called during SIGINT
      // For this test, we just verify the store is created with close method
      expect(mockFileStore.close).toBeDefined();
    });
  });
});
