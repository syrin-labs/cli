/**
 * `syrin dev` command implementation.
 * Interactive development mode for testing MCP tools with LLMs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfigWithGlobal, configExists } from '@/config/loader';
import { loadGlobalConfig } from '@/config/global-loader';
import { getLLMProvider } from '@/runtime/llm/factory';
import { createMCPClientManager } from '@/runtime/mcp/client/manager';
import { RuntimeEventEmitter } from '@/events/emitter';
import { MemoryEventStore } from '@/events/store/memory-store';
import { FileEventStore } from '@/events/store/file-store';
import { DevSession } from '@/runtime/dev/session';
import { ChatUI } from '@/presentation/dev/chat-ui';
import { DevEventMapper } from '@/runtime/dev/event-mapper';
import { ConfigurationError } from '@/utils/errors';
import { handleCommandError } from '@/cli/utils';
import { log } from '@/utils/logger';
import { Messages, Paths, TransportTypes, FileExtensions } from '@/constants';
import { makeSessionID } from '@/types/factories';
import { v4 as uuidv4 } from 'uuid';
import type { SyrinConfig } from '@/config/types';
import {
  buildDevWelcomeMessages,
  formatToolsList,
  formatCommandHistory,
} from '@/presentation/dev-ui';
import type { VersionInfo } from '@/utils/version-checker';

/**
 * Resolve the server command to use based on config and run-script flag.
 * @param config - Syrin configuration
 * @param runScript - Whether to run the script (spawn server)
 * @returns Resolved command and whether to spawn the server
 */
function resolveServerCommand(
  config: SyrinConfig,
  runScript: boolean
): { command: string | undefined; shouldSpawn: boolean } {
  // If run-script flag is provided, spawn using config.script
  if (runScript) {
    if (!config.script) {
      throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED_RUN_FLAG);
    }
    return { command: config.script, shouldSpawn: true };
  }

  // No run-script flag provided
  if (config.transport === TransportTypes.STDIO) {
    // For stdio, always spawn using script
    if (!config.script) {
      throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED);
    }
    return { command: config.script, shouldSpawn: true };
  }

  // For HTTP without run-script flag, don't spawn (connect to existing server)
  return { command: undefined, shouldSpawn: false };
}

export interface DevCommandOptions {
  /** Execute tool calls (default: preview mode) */
  exec?: boolean;
  /** Override default LLM provider */
  llm?: string;
  /** Project root directory */
  projectRoot?: string;
  /** Save events to file */
  saveEvents?: boolean;
  /** Event file path */
  eventFile?: string;
  /** Run script to spawn server internally */
  runScript?: boolean;
  /** Transport type override */
  transport?: 'stdio' | 'http';
  /** MCP server URL override (for http transport) */
  url?: string;
  /** Script command override (for stdio transport) */
  script?: string;
}

/**
 * Execute the dev command.
 */
export async function executeDev(
  options: DevCommandOptions = {}
): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd();

  try {
    // Load configuration (with global fallback)
    const localExists = configExists(projectRoot);
    const globalExists = loadGlobalConfig() !== null;

    let config: SyrinConfig;
    let configSource: 'local' | 'global';

    try {
      const configResult = loadConfigWithGlobal(projectRoot, {
        transport: options.transport,
        url: options.url,
        script: options.script,
      });
      config = configResult.config;
      configSource = configResult.source;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No configuration found')
      ) {
        log.blank();
        log.error('❌ No configuration found.');
        log.blank();
        if (!localExists && !globalExists) {
          log.info('💡 Options:');
          log.info('   1. Create local config: syrin init');
          log.info('   2. Set up global config: syrin init --global');
          log.blank();
        } else if (!localExists) {
          log.info('💡 Using global config requires CLI flags:');
          log.info('   --transport <stdio|http>');
          if (options.transport === 'http') {
            log.info('   --url <url>');
          } else if (options.transport === 'stdio') {
            log.info('   --script <command>');
          } else {
            // Show both options when transport is not specified
            log.info('   --url <url> (for http transport)');
            log.info('   --script <command> (for stdio transport)');
          }
          log.blank();
        }
        throw error;
      }
      throw error;
    }

    // Show config source
    if (configSource === 'global') {
      log.blank();
      log.info('ℹ️  Using global configuration from ~/.syrin/syrin.yaml');
      log.info('   (No local syrin.yaml found in current directory)');
      log.blank();
    }

    // Validate transport configuration
    if (config.transport === TransportTypes.HTTP && !config.url) {
      throw new ConfigurationError(Messages.TRANSPORT_URL_REQUIRED_CONFIG);
    }

    // Resolve server command based on transport and run-script flag
    const { command: serverCommand, shouldSpawn } = resolveServerCommand(
      config,
      options.runScript || false
    );

    // For stdio, server command is always required
    if (config.transport === TransportTypes.STDIO && !serverCommand) {
      throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED);
    }

    // Create session ID
    const sessionId = makeSessionID(`dev-${uuidv4()}`);

    // Create event store
    let eventStore: MemoryEventStore | FileEventStore;
    if (options.saveEvents) {
      // Determine events directory
      // If eventFile is provided, treat it as a directory path
      // If it looks like a file path (ends with .jsonl), use its directory
      let eventsDir: string;
      if (options.eventFile) {
        if (options.eventFile.endsWith(FileExtensions.JSONL)) {
          // User provided a file path, use its directory
          eventsDir = path.dirname(options.eventFile);
        } else {
          // User provided a directory path
          eventsDir = options.eventFile;
        }
      } else {
        // Default to .syrin/events in project root
        eventsDir = path.join(projectRoot, Paths.EVENTS_DIR);
      }
      eventStore = new FileEventStore(eventsDir);
      const eventFilePath = path.join(
        eventsDir,
        `${sessionId}${FileExtensions.JSONL}`
      );
      log.info(`Events will be saved to: ${eventFilePath}`);
      log.blank();
      log.info(`Events are being saved to: ${eventFilePath}`);
      log.blank();
    } else {
      eventStore = new MemoryEventStore();
    }

    // Create event emitter
    const eventEmitter = new RuntimeEventEmitter(
      eventStore,
      sessionId,
      null, // workflowId
      null // promptId
    );

    // Create LLM provider
    const llmProvider = getLLMProvider(options.llm, config, projectRoot);

    // Create MCP client manager
    const mcpClientManager = createMCPClientManager(
      config.transport,
      config.url,
      serverCommand,
      eventEmitter,
      shouldSpawn
    );

    // Set up cleanup handlers for all exit scenarios
    // This ensures child processes are always killed, even on unexpected exits
    const cleanup = async (): Promise<void> => {
      try {
        // Always disconnect (this kills the child process)
        await mcpClientManager.disconnect();

        // Close event store if used
        if (options.saveEvents && eventStore instanceof FileEventStore) {
          await eventStore.close();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(`Error: ${err.message}`);
        // Even if disconnect fails, try to kill the process directly
        // This is a safety net to ensure cleanup happens
      }
    };

    // Note: SIGINT handling is now done in the ChatUI section below

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      void (async (): Promise<void> => {
        await cleanup();
        process.exit(0);
      })();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      void (async (): Promise<void> => {
        log.error(`Error: ${error.message}`);
        await cleanup();
        process.exit(1);
      })();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      void (async (): Promise<void> => {
        log.error(
          `Error: ${reason instanceof Error ? reason.message : String(reason)}`
        );
        await cleanup();
        process.exit(1);
      })();
    });

    // Connect to MCP server
    await mcpClientManager.connect();

    // Get available tools
    const availableTools = await mcpClientManager.getAvailableTools();

    // Get version info for welcome banner and session events
    const versionChecker = (await import('@/utils/version-checker')) as {
      checkSyrinVersion: () => Promise<VersionInfo>;
      formatVersionWithUpdate: (info: VersionInfo) => string;
    };
    const versionInfo = await versionChecker.checkSyrinVersion();
    const versionDisplayString =
      versionChecker.formatVersionWithUpdate(versionInfo);

    // Create dev session
    const session = new DevSession({
      config,
      syrinVersion: versionInfo.current,
      llmProvider,
      mcpClientManager,
      eventEmitter,
      executionMode: options.exec || false,
      projectRoot,
    });

    // Initialize session
    await session.initialize();

    // Build initial info messages for chat UI (will scroll away when user starts typing)
    const displayCommand =
      shouldSpawn && serverCommand ? serverCommand : undefined;
    const initialMessages = buildDevWelcomeMessages();

    // Create Chat UI
    const historyFile = path.join(projectRoot, Paths.DEV_HISTORY_FILE);
    // Bind the method to avoid closure type inference issues
    const addToHistory = session.addUserMessageToHistory.bind(session);
    // Declare event mapper variable (will be initialized after ChatUI starts)
    // We need it in the onExit closure, so declare it here before ChatUI constructor

    let eventMapper: DevEventMapper | undefined;
    // Create ChatUI first (event mapper needs it)
    const chatUI = new ChatUI({
      agentName: config.agent_name,
      llmProviderName: llmProvider.getName(),
      showTimestamps: false,
      initialMessages,
      welcomeBanner: {
        versionDisplay: versionDisplayString,
        llmProvider: llmProvider.getName(),
        toolCount: availableTools.length,
        transport: config.transport,
        mcpUrl: config.url,
        command: displayCommand,
      },
      historyFile,
      maxHistorySize: 1000,
      getSessionState: (): {
        totalToolCalls: number;
        toolCalls: Array<{ name: string; timestamp: Date }>;
        startTime: Date;
      } => {
        const state = session.getState();
        return {
          totalToolCalls: state.totalToolCalls,
          toolCalls: state.toolCalls.map(tc => ({
            name: tc.name,
            timestamp: tc.timestamp,
          })),
          startTime: state.startTime,
        };
      },
      llmProvider: {
        chat: async (request: {
          messages: Array<{ role: string; content: string }>;
          temperature?: number;
          maxTokens?: number;
        }): Promise<{ content: string }> => {
          // Convert minimal request to LLMRequest format
          const llmRequest = {
            messages: request.messages.map(msg => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
            })),
            temperature: request.temperature,
            maxTokens: request.maxTokens,
          };
          const response = await llmProvider.chat(llmRequest);
          // Convert LLMResponse to minimal format
          return {
            content:
              typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content),
          };
        },
      },
      onMessage: async (input: string): Promise<void> => {
        // Handle special commands (these need explicit history tracking)
        if (input === '/tools') {
          // Add to history for special commands that don't call processUserInput
          addToHistory(input);
          const tools = session.getAvailableTools();
          const toolsList = formatToolsList(tools);
          chatUI.addMessage('system', toolsList);
          return;
        }

        if (input.startsWith('/save-json')) {
          // Add to history for special commands
          addToHistory(input);

          const { handleSaveJSONCommand } =
            await import('@/utils/save-json-handler');
          const result = await handleSaveJSONCommand(
            input,
            session,
            projectRoot
          );
          chatUI.addMessage('system', result.message);

          return;
        }

        if (input === '/history') {
          // Add to history for special commands
          addToHistory(input);
          // Read history from .syrin/.dev-history file
          try {
            if (fs.existsSync(historyFile)) {
              const content = fs.readFileSync(historyFile, 'utf-8');
              const historyLines = content
                .split('\n')
                .filter((line: string) => line.trim())
                .slice(-100); // Show last 100 entries

              const historyDisplay = formatCommandHistory(historyLines);
              chatUI.addMessage('system', historyDisplay);
            } else {
              chatUI.addMessage('system', Messages.DEV_NO_HISTORY);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            chatUI.addMessage(
              'system',
              Messages.DEV_ERROR_READING_HISTORY(errorMessage)
            );
            const err =
              error instanceof Error ? error : new Error(String(error));
            log.error(`Error: ${err.message}`);
          }
          return;
        }

        // Process user input through session
        try {
          await session.processUserInput(input);

          // Get the latest assistant response from conversation history
          // Note: Tool call events are already displayed incrementally by the event mapper
          const stateAfter = session.getState();
          const lastMessage =
            stateAfter.conversationHistory[
              stateAfter.conversationHistory.length - 1
            ];

          if (lastMessage && lastMessage.role === 'assistant') {
            chatUI.addMessage('assistant', lastMessage.content);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          chatUI.addMessage('system', `❌ Error: ${errorMessage}`);
          const err = error instanceof Error ? error : new Error(String(error));
          log.error(`Error: ${err.message}`);
        }
      },
      onExit: async (): Promise<void> => {
        // Stop event mapper (it's guaranteed to be defined by this point)
        eventMapper?.stop();
        // Cleanup on exit
        try {
          await session.complete();
          await mcpClientManager.disconnect();

          // Close file event store if used
          if (options.saveEvents && eventStore instanceof FileEventStore) {
            await eventStore.close();
            log.info('Event store closed');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          log.error(`Error: ${err.message}`);
        }
      },
    });

    // Start Chat UI first to ensure refs are ready
    // Start Chat UI (header message is already set in options)
    await chatUI.start();

    // Create and start event mapper for incremental visibility
    // This provides real-time event updates to the UI as events are emitted
    // Must be started AFTER ChatUI is started so refs are ready
    eventMapper = new DevEventMapper(
      eventEmitter,
      chatUI,
      llmProvider.getName()
    );
    eventMapper.start(); // Now it's defined, we can call start

    // Handle SIGINT (Ctrl+C) - ensure cleanup happens
    let isExiting = false;
    process.once('SIGINT', () => {
      if (isExiting) {
        return; // Already handling exit
      }
      isExiting = true;
      log.plain(Messages.DEV_GOODBYE);
      // Stop event mapper (it's guaranteed to be defined by this point)
      eventMapper?.stop();
      chatUI.stop();
      void (async (): Promise<void> => {
        try {
          await session.complete();
          await mcpClientManager.disconnect();

          // Close file event store if used
          if (options.saveEvents && eventStore instanceof FileEventStore) {
            await eventStore.close();
          }
          // Give a small delay to ensure process is killed
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          log.error(`Error: ${err.message}`);
        }
        process.exit(0);
      })();
    });
  } catch (error) {
    handleCommandError(error, Messages.DEV_ERROR_START);
  }
}
