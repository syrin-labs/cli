/**
 * `syrin dev` command implementation.
 * Interactive development mode for testing MCP tools with LLMs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '@/config/loader';
import { getLLMProvider } from '@/runtime/llm/factory';
import { createMCPClientManager } from '@/runtime/mcp/client/manager';
import { RuntimeEventEmitter } from '@/events/emitter';
import { MemoryEventStore } from '@/events/store/memory-store';
import { FileEventStore } from '@/events/store/file-store';
import { DevSession } from '@/runtime/dev/session';
import { ChatUI } from '@/presentation/dev/chat-ui';
import { ConfigurationError } from '@/utils/errors';
import { handleCommandError } from '@/cli/utils';
import { logger } from '@/utils/logger';
import {
  Messages,
  Paths,
  Icons,
  TransportTypes,
  FileExtensions,
} from '@/constants';
import { makeSessionID } from '@/types/factories';
import { v4 as uuidv4 } from 'uuid';
import type { SyrinConfig } from '@/config/types';
import {
  buildDevWelcomeMessages,
  formatToolsList,
  formatCommandHistory,
  formatToolCallInfo,
  formatToolResult,
} from '@/presentation/dev-ui';

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
}

import { showVersionBanner } from '@/cli/utils/version-banner';

/**
 * Execute the dev command.
 */
export async function executeDev(
  options: DevCommandOptions = {}
): Promise<void> {
  await showVersionBanner();
  const projectRoot = options.projectRoot || process.cwd();

  try {
    // Load configuration
    const config = loadConfig(projectRoot);

    // Validate transport configuration
    if (config.transport === TransportTypes.HTTP && !config.mcp_url) {
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
      logger.info(`Events will be saved to: ${eventFilePath}`);
      console.log(
        `\n${Icons.TIP} Events are being saved to: ${eventFilePath}\n`
      );
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
      config.mcp_url,
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
        logger.error('Error during cleanup', err);
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
        logger.error('Uncaught exception', error);
        await cleanup();
        process.exit(1);
      })();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      void (async (): Promise<void> => {
        logger.error(
          'Unhandled rejection',
          reason instanceof Error ? reason : new Error(String(reason))
        );
        await cleanup();
        process.exit(1);
      })();
    });

    // Connect to MCP server
    await mcpClientManager.connect();

    // Get available tools
    const availableTools = await mcpClientManager.getAvailableTools();

    // Create dev session
    const session = new DevSession({
      config,
      llmProvider,
      mcpClientManager,
      eventEmitter,
      executionMode: options.exec || false,
    });

    // Initialize session
    await session.initialize();

    // Build initial info messages for chat UI (will scroll away when user starts typing)
    const displayCommand =
      shouldSpawn && serverCommand ? serverCommand : undefined;
    const initialMessages = await buildDevWelcomeMessages({
      version: config.version,
      llmProvider: llmProvider.getName(),
      toolCount: availableTools.length,
      transport: config.transport,
      mcpUrl: config.mcp_url,
      command: displayCommand,
    });

    // Create Chat UI
    const historyFile = path.join(projectRoot, Paths.DEV_HISTORY_FILE);
    const chatUI = new ChatUI({
      agentName: config.agent_name,
      llmProviderName: llmProvider.getName(),
      showTimestamps: false,
      initialMessages,
      historyFile,
      maxHistorySize: 1000,
      onMessage: async (input: string): Promise<void> => {
        // Handle special commands
        if (input === '/tools') {
          const tools = session.getAvailableTools();
          const toolsList = formatToolsList(tools);
          chatUI.addMessage('system', toolsList);
          return;
        }

        if (input === '/history') {
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
            logger.error('Error reading history file', err);
          }
          return;
        }

        // Process user input through session
        try {
          // Track state before processing
          const stateBefore = session.getState();
          const toolCallsBefore = stateBefore.toolCalls.length;

          await session.processUserInput(input);

          // Get updated state
          const stateAfter = session.getState();

          // Display any new tool calls that were executed
          const newToolCalls = stateAfter.toolCalls.slice(toolCallsBefore);
          for (const toolCall of newToolCalls) {
            // Display tool call info
            const toolInfo = formatToolCallInfo(
              toolCall.name,
              toolCall.arguments
            );
            chatUI.addMessage('system', toolInfo);

            // Display tool result
            if (toolCall.result !== undefined) {
              const resultInfo = formatToolResult(
                toolCall.name,
                toolCall.result,
                toolCall.duration
              );
              chatUI.addMessage('system', resultInfo);
            }
          }

          // Get the latest assistant response from conversation history
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
          logger.error('Error processing user input', err);
        }
      },
      onExit: async (): Promise<void> => {
        // Cleanup on exit
        try {
          await session.complete();
          await mcpClientManager.disconnect();

          // Close file event store if used
          if (options.saveEvents && eventStore instanceof FileEventStore) {
            await eventStore.close();
            logger.info('Event store closed');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Error during cleanup', err);
        }
      },
    });

    // Handle SIGINT (Ctrl+C) - ensure cleanup happens
    let isExiting = false;
    process.once('SIGINT', () => {
      if (isExiting) {
        return; // Already handling exit
      }
      isExiting = true;
      console.log(Messages.DEV_GOODBYE);
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
          logger.error('Error during SIGINT cleanup', err);
        }
        process.exit(0);
      })();
    });

    // Start Chat UI (header message is already set in options)
    await chatUI.start();
  } catch (error) {
    handleCommandError(error, Messages.DEV_ERROR_START);
  }
}
