/**
 * `syrin dev` command implementation.
 * Interactive development mode for testing MCP tools with LLMs.
 */

import * as path from 'path';
import { loadConfig } from '@/config/loader';
import { getLLMProvider } from '@/runtime/llm/factory';
import { createMCPClientManager } from '@/runtime/mcp/client-manager';
import { RuntimeEventEmitter } from '@/events/emitter';
import { MemoryEventStore } from '@/events/store/memory-store';
import { FileEventStore } from '@/events/store/file-store';
import { DevSession } from '@/runtime/dev/session';
import { InteractiveREPL } from '@/runtime/dev/repl';
import { DevFormatter } from '@/runtime/dev/formatter';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Icons, Paths } from '@/constants';
import { makeSessionID } from '@/types/factories';
import { v4 as uuidv4 } from 'uuid';
import type { SyrinConfig } from '@/config/types';

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
      throw new ConfigurationError(
        'script is required when using --run-script flag'
      );
    }
    return { command: config.script, shouldSpawn: true };
  }

  // No run-script flag provided
  if (config.transport === 'stdio') {
    // For stdio, always spawn using script
    if (!config.script) {
      throw new ConfigurationError('script is required for stdio transport');
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
    if (config.transport === 'http' && !config.mcp_url) {
      throw new ConfigurationError(
        'MCP URL is required for HTTP transport. Set it in config.yaml.'
      );
    }

    // Resolve server command based on transport and run-script flag
    const { command: serverCommand, shouldSpawn } = resolveServerCommand(
      config,
      options.runScript || false
    );

    // For stdio, server command is always required
    if (config.transport === 'stdio' && !serverCommand) {
      throw new ConfigurationError('script is required for stdio transport');
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
        if (options.eventFile.endsWith('.jsonl')) {
          // User provided a file path, use its directory
          eventsDir = path.dirname(options.eventFile);
        } else {
          // User provided a directory path
          eventsDir = options.eventFile;
        }
      } else {
        // Default to .syrin/events in project root
        eventsDir = path.join(projectRoot, Paths.SYRIN_DIR, 'events');
      }
      eventStore = new FileEventStore(eventsDir);
      const eventFilePath = path.join(eventsDir, `${sessionId}.jsonl`);
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

    // Connect to MCP server
    await mcpClientManager.connect();

    // Get available tools
    const availableTools = await mcpClientManager.getAvailableTools();

    // Create formatter
    const formatter = new DevFormatter();

    // Display header
    const displayCommand =
      shouldSpawn && serverCommand ? serverCommand : undefined;
    formatter.displayHeader(
      config.version,
      config.transport,
      config.mcp_url,
      displayCommand,
      llmProvider.getName(),
      availableTools.length
    );

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

    // Display welcome message
    formatter.displayWelcomeMessage();

    // Create REPL with agent name from config
    const historyFile = path.join(projectRoot, Paths.SYRIN_DIR, '.dev-history');
    const replPrompt = `Hey, ${config.agent_name}! > `;
    const repl = new InteractiveREPL(
      {
        prompt: replPrompt,
        saveHistory: true,
        historyFile,
      },
      eventEmitter
    );

    // Start REPL
    repl.start(
      async (input: string) => {
        // Handle special REPL commands
        if (input === '/tools') {
          const tools = session.getAvailableTools();
          formatter.displayToolsList(tools);
          return;
        }

        // Note: User input is already displayed by readline, so we don't need to display it again
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
            // Display tool detection
            formatter.displayToolDetection([
              {
                id: toolCall.id,
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            ]);

            // Display tool execution
            formatter.displayToolExecutionStart(toolCall.name);
            if (toolCall.duration) {
              formatter.displayToolExecutionEnd(
                toolCall.name,
                toolCall.duration
              );
            }

            // Display tool result
            if (toolCall.result !== undefined) {
              formatter.displayToolResult(toolCall.name, toolCall.result);
            }
          }

          // Get the latest assistant response from conversation history
          const lastMessage =
            stateAfter.conversationHistory[
              stateAfter.conversationHistory.length - 1
            ];

          if (lastMessage && lastMessage.role === 'assistant') {
            formatter.displayLLMResponse(
              llmProvider.getName(),
              lastMessage.content
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          formatter.displayError(`Error processing input: ${errorMessage}`);
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Error processing user input', err);
        }
      },
      (): void => {
        // Cleanup on close
        void (async (): Promise<void> => {
          try {
            await session.complete();
            await mcpClientManager.disconnect();

            // Close file event store if used
            if (options.saveEvents && eventStore instanceof FileEventStore) {
              await eventStore.close();
              logger.info('Event store closed');
            }
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            logger.error('Error during cleanup', err);
          }
        })();
      }
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else {
      console.error(`\n${Icons.ERROR} Failed to start dev mode\n`);
      process.exit(1);
    }
  }
}
