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
import { DevEventMapper } from '@/runtime/dev/event-mapper';
import { ConfigurationError } from '@/utils/errors';
import { handleCommandError } from '@/cli/utils';
import { logger, log } from '@/utils/logger';
import { Messages, Paths, TransportTypes, FileExtensions } from '@/constants';
import { makeSessionID } from '@/types/factories';
import { v4 as uuidv4 } from 'uuid';
import type { SyrinConfig } from '@/config/types';
import {
  buildDevWelcomeMessages,
  formatToolsList,
  formatCommandHistory,
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

/**
 * Execute the dev command.
 */
export async function executeDev(
  options: DevCommandOptions = {}
): Promise<void> {
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
      projectRoot,
    });

    // Initialize session
    await session.initialize();

    // Build initial info messages for chat UI (will scroll away when user starts typing)
    const displayCommand =
      shouldSpawn && serverCommand ? serverCommand : undefined;
    const initialMessages = buildDevWelcomeMessages();

    // Get version info for welcome banner - use same approach as other commands
    const { checkVersion, formatVersionWithUpdate } =
      await import('@/utils/version-checker');
    const versionInfo = await checkVersion('@ankan-ai/syrin');
    const versionDisplayString = formatVersionWithUpdate(versionInfo);

    // Create Chat UI
    const historyFile = path.join(projectRoot, Paths.DEV_HISTORY_FILE);
    // Bind the method to avoid closure type inference issues
    const addToHistory = session.addUserMessageToHistory.bind(session);
    // Declare event mapper variable (will be initialized after ChatUI starts)
    // We need it in the onExit closure, so declare it here before ChatUI constructor
    // eslint-disable-next-line prefer-const
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
        mcpUrl: config.mcp_url,
        command: displayCommand,
      },
      historyFile,
      maxHistorySize: 1000,
      onMessage: async (input: string): Promise<void> => {
        // Add user input to session conversation history (even for special commands)
        // This ensures all commands are saved in chat history
        addToHistory(input);

        // Handle special commands
        if (input === '/tools') {
          const tools = session.getAvailableTools();
          const toolsList = formatToolsList(tools);
          chatUI.addMessage('system', toolsList);
          return;
        }

        if (input.startsWith('/save-json')) {
          // Save tool result JSON to file
          // Usage: /save-json [tool-name-or-index]
          // If no argument, saves the last tool result
          const parts = input.split(/\s+/);
          const toolIdentifier = parts[1]; // Optional: tool name or index

          try {
            const sessionState = session.getState();
            const toolCalls = sessionState.toolCalls;

            if (toolCalls.length === 0) {
              chatUI.addMessage(
                'system',
                'No tool calls found. Run a tool first to save its result.'
              );
              return;
            }

            // Find the tool call to save
            let toolCallToSave: (typeof toolCalls)[number] | undefined;

            if (toolIdentifier) {
              // Try to find by index first
              const index = parseInt(toolIdentifier, 10);
              if (!isNaN(index) && index > 0 && index <= toolCalls.length) {
                // 1-indexed for user convenience
                toolCallToSave = toolCalls[index - 1];
              } else {
                // Try to find by name (case-insensitive, partial match)
                const matchingCalls = toolCalls.filter(tc =>
                  tc.name.toLowerCase().includes(toolIdentifier.toLowerCase())
                );
                if (matchingCalls.length === 0) {
                  chatUI.addMessage(
                    'system',
                    `No tool found matching "${toolIdentifier}". Use /save-json without arguments to save the last result, or use a tool index (1-${toolCalls.length}).`
                  );
                  return;
                } else if (matchingCalls.length > 1) {
                  // Multiple matches - show list
                  const toolList = matchingCalls
                    .map(
                      tc =>
                        `  ${toolCalls.indexOf(tc) + 1}. ${tc.name} (${tc.timestamp.toLocaleTimeString()})`
                    )
                    .join('\n');
                  chatUI.addMessage(
                    'system',
                    `Multiple tools found matching "${toolIdentifier}":\n${toolList}\n\nUse /save-json <index> to save a specific one.`
                  );
                  return;
                } else {
                  toolCallToSave = matchingCalls[0];
                }
              }
            } else {
              // No identifier - use last tool call
              toolCallToSave = toolCalls[toolCalls.length - 1];
            }

            if (!toolCallToSave) {
              chatUI.addMessage('system', 'No tool result available to save.');
              return;
            }

            // Check if result is available (either direct or via reference)
            if (!toolCallToSave.result && !toolCallToSave.resultReference) {
              chatUI.addMessage('system', 'No tool result available to save.');
              return;
            }

            try {
              // Get the result (load from file if externalized)
              const result = session.getToolResult(toolCallToSave);

              const { saveJSONToFile, getFileSize } =
                await import('@/utils/json-file-saver');
              // Save to .syrin/data directory
              const dataDir = path.join(projectRoot, '.syrin', 'data');
              const filePath = saveJSONToFile(
                result,
                toolCallToSave.name,
                dataDir
              );
              const fileSize = getFileSize(filePath);

              chatUI.addMessage(
                'system',
                `✅ JSON saved to file:\n   ${filePath}\n   Size: ${fileSize}\n   Tool: ${toolCallToSave.name}\n\n💡 You can open this file with: cat "${filePath}" | jq .`
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              chatUI.addMessage(
                'system',
                `❌ Error loading tool result: ${errorMessage}`
              );
              const err =
                error instanceof Error ? error : new Error(String(error));
              logger.error('Error loading tool result for save', err);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            chatUI.addMessage(
              'system',
              `❌ Error saving JSON: ${errorMessage}`
            );
            const err =
              error instanceof Error ? error : new Error(String(error));
            logger.error('Error saving JSON to file', err);
          }
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
          logger.error('Error processing user input', err);
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
            logger.info('Event store closed');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Error during cleanup', err);
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
          logger.error('Error during SIGINT cleanup', err);
        }
        process.exit(0);
      })();
    });
  } catch (error) {
    handleCommandError(error, Messages.DEV_ERROR_START);
  }
}
