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
        'MCP URL is required for HTTP transport. Set it in config.yaml or use --url option.'
      );
    }

    if (config.transport === 'stdio' && !config.command) {
      throw new ConfigurationError(
        'Command is required for stdio transport. Set it in config.yaml or use --command option.'
      );
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
      config.command,
      eventEmitter
    );

    // Connect to MCP server
    await mcpClientManager.connect();

    // Get available tools
    const availableTools = await mcpClientManager.getAvailableTools();

    // Create formatter
    const formatter = new DevFormatter();

    // Display header
    formatter.displayHeader(
      config.version,
      config.transport,
      config.mcp_url,
      config.command,
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

    // Create REPL
    const historyFile = path.join(projectRoot, Paths.SYRIN_DIR, '.dev-history');
    const repl = new InteractiveREPL(
      {
        prompt: 'User > ',
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

        // Display user input
        formatter.displayUserInput(input);

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
      logger.error('Configuration error', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else if (error instanceof Error) {
      logger.error('Dev command failed', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else {
      logger.error('Dev command failed', new Error(String(error)));
      console.error(`\n${Icons.ERROR} Failed to start dev mode\n`);
      process.exit(1);
    }
  }
}
