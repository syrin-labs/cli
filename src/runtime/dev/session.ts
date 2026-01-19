/**
 * Dev Mode Session.
 * Orchestrates LLM-MCP interactions with event emission.
 */

import type { DevSessionConfig, DevSessionState, ToolCallInfo } from './types';
import type { LLMMessage, ToolCall, ToolDefinition } from '@/runtime/llm/types';
import {
  SessionLifecycleEventType,
  LLMContextEventType,
  LLMProposalEventType,
  ValidationEventType,
} from '@/events/event-type';
import type {
  SessionStartedPayload,
  SessionCompletedPayload,
  SessionHaltedPayload,
} from '@/events/payloads/session';
import type {
  LLMContextBuiltPayload,
  PostToolLLMPromptBuiltPayload,
  LLMProposedToolCallPayload,
  LLMFinalResponseGeneratedPayload,
} from '@/events/payloads/llm';
import type {
  ToolCallValidationStartedPayload,
  ToolCallValidationPassedPayload,
  ToolCallValidationFailedPayload,
} from '@/events/payloads/validation';
import { makePromptID } from '@/types/factories';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { DataManager } from './data-manager';

/**
 * Dev Mode Session implementation.
 */
export class DevSession {
  private state: DevSessionState;
  private availableTools: ToolDefinition[] = [];
  private currentPromptId: string | null = null;
  private dataManager: DataManager;
  private readonly MAX_HISTORY_LENGTH = 50; // Max messages in LLM context
  private readonly MAX_MESSAGE_SIZE = 10 * 1024; // 10KB per message

  constructor(private readonly config: DevSessionConfig) {
    this.state = {
      conversationHistory: [],
      toolCalls: [],
      totalToolCalls: 0,
      totalLLMCalls: 0,
      startTime: new Date(),
    };
    this.dataManager = new DataManager(config.projectRoot);
  }

  /**
   * Initialize the session.
   * Loads available tools and emits session started event.
   */
  async initialize(): Promise<void> {
    // Emit session started event
    await this.config.eventEmitter.emit<SessionStartedPayload>(
      SessionLifecycleEventType.SESSION_STARTED,
      {
        project_name: this.config.config.project_name,
        syrin_version: this.config.config.version,
      }
    );

    // Load available tools from MCP server
    try {
      const tools = await this.config.mcpClientManager.getAvailableTools();
      this.availableTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      // Emit tool registry loaded event
      // Note: This would be TOOL_REGISTRY_LOADED, but we'll use what's available
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load tools: ${errorMessage}`);
    }
  }

  /**
   * Add user message to conversation history without processing.
   * Useful for special commands that don't need LLM processing.
   */
  addUserMessageToHistory(userInput: string): void {
    this.state.conversationHistory.push({
      role: 'user',
      content: userInput,
    });
  }

  /**
   * Process user input.
   * This is the main entry point for handling user messages.
   */
  async processUserInput(userInput: string): Promise<void> {
    // Add user message to conversation history
    this.addUserMessageToHistory(userInput);

    // Process the conversation (may involve multiple LLM calls if tools are used)
    await this.processConversation();
  }

  /**
   * Process the conversation.
   * Handles LLM calls and tool execution in a loop until final response.
   */
  private async processConversation(): Promise<void> {
    const maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      this.state.totalLLMCalls++;

      // Generate prompt ID for this LLM call
      const promptId = makePromptID(uuidv4());
      this.currentPromptId = promptId;

      // Build LLM context with tools
      const llmRequest = this.buildLLMContext();

      // Emit LLM context built event
      await this.config.eventEmitter.emit<LLMContextBuiltPayload>(
        LLMContextEventType.LLM_CONTEXT_BUILT,
        {
          prompt_id: promptId,
          context: {
            messages: llmRequest.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date().toISOString(),
            })),
            tools: llmRequest.tools?.map(tool => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
            })),
          },
          tool_definitions: this.availableTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
          })),
          system_prompt: llmRequest.systemPrompt,
        }
      );

      // Call LLM
      const startTime = Date.now();
      const llmResponse = await this.config.llmProvider.chat(llmRequest);
      const duration = Date.now() - startTime;

      // Add assistant response to conversation history
      this.state.conversationHistory.push({
        role: 'assistant',
        content: llmResponse.content || '',
      });

      // Check if LLM wants to call tools
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        // Process tool calls
        const toolResults = await this.processToolCalls(llmResponse.toolCalls);

        // Build post-tool prompt with tool results
        const postToolPrompt = this.buildPostToolPrompt(
          llmResponse.toolCalls,
          toolResults
        );

        // Emit post-tool LLM prompt built event
        await this.config.eventEmitter.emit<PostToolLLMPromptBuiltPayload>(
          LLMContextEventType.POST_TOOL_LLM_PROMPT_BUILT,
          {
            prompt_id: promptId,
            tool_call_result: toolResults[0] || {
              tool_name: '',
              arguments: {},
              result: null,
              duration_ms: 0,
            },
            context: {
              messages: postToolPrompt.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date().toISOString(),
              })),
            },
          }
        );

        // Continue the loop to get final response from LLM
        continue;
      }

      // No tool calls - emit final response and return
      await this.config.eventEmitter.emit<LLMFinalResponseGeneratedPayload>(
        LLMProposalEventType.LLM_FINAL_RESPONSE_GENERATED,
        {
          response_text: llmResponse.content || '',
          finish_reason: llmResponse.finishReason || 'stop',
          token_count: llmResponse.usage?.totalTokens,
          duration_ms: duration,
        }
      );

      return;
    }

    // If we've exceeded max iterations, halt
    await this.halt(
      `Maximum conversation iterations (${maxIterations}) exceeded`
    );
  }

  /**
   * Build LLM context from conversation history and available tools.
   * Truncates history to prevent context from growing too large.
   */
  private buildLLMContext(): {
    messages: LLMMessage[];
    tools?: ToolDefinition[];
    systemPrompt?: string;
  } {
    // Get recent conversation history (truncate if too long)
    let messages = [...this.state.conversationHistory];

    if (messages.length > this.MAX_HISTORY_LENGTH) {
      // Keep most recent messages
      messages = messages.slice(-this.MAX_HISTORY_LENGTH);
    }

    // Truncate individual messages if too large
    messages = messages.map(msg => {
      if (msg.content.length > this.MAX_MESSAGE_SIZE) {
        return {
          ...msg,
          content:
            msg.content.substring(0, this.MAX_MESSAGE_SIZE) +
            '\n[... truncated, see tool result files for full data]',
        };
      }
      return msg;
    });

    // Build system prompt
    const systemPrompt = `You are ${this.config.config.agent_name}, an AI assistant with access to tools.
You can use the available tools to help the user. When you need to use a tool, make a tool call.
After tool execution, you will receive the results and can provide a final response to the user.
Note: Large tool results may be stored externally and referenced by ID. If you see a data reference ID, 
you can request the full data if needed.`;

    return {
      messages,
      tools: this.availableTools,
      systemPrompt,
    };
  }

  /**
   * Process tool calls from LLM.
   */
  private async processToolCalls(toolCalls: ToolCall[]): Promise<
    Array<{
      tool_name: string;
      arguments: Record<string, unknown>;
      result: unknown;
      duration_ms: number;
    }>
  > {
    const results: Array<{
      tool_name: string;
      arguments: Record<string, unknown>;
      result: unknown;
      duration_ms: number;
    }> = [];

    // Deduplicate tool calls to prevent executing the same tool call multiple times
    // This can happen if the LLM returns duplicate tool calls in a single response
    // We deduplicate by tool name + normalized arguments to avoid redundant executions
    const seenKeys = new Set<string>();
    const uniqueToolCalls: ToolCall[] = [];
    const skippedDuplicates: Array<{ toolCall: ToolCall; reason: string }> = [];

    for (const toolCall of toolCalls) {
      // Create a unique key from tool name + arguments (normalized JSON)
      // This ensures we don't execute the same tool with the same arguments twice
      const normalizedArgs = JSON.stringify(
        toolCall.arguments,
        Object.keys(toolCall.arguments).sort()
      );
      const key = `${toolCall.name}:${normalizedArgs}`;

      if (seenKeys.has(key)) {
        // Track skipped duplicates to inform the LLM
        skippedDuplicates.push({
          toolCall,
          reason: `Duplicate tool call detected: ${toolCall.name} with identical arguments was already executed`,
        });
        // Use logger instead of console.warn for proper event tracking

        logger.warn(
          `Skipping duplicate tool call: ${toolCall.name} with arguments ${normalizedArgs}`
        );
        continue;
      }

      seenKeys.add(key);
      uniqueToolCalls.push(toolCall);
    }

    // If we skipped duplicates, add them to conversation history so LLM knows
    if (skippedDuplicates.length > 0) {
      const skippedMessages = skippedDuplicates.map(
        ({ toolCall, reason }) =>
          `Tool call ${toolCall.name}(${JSON.stringify(toolCall.arguments)}) was skipped: ${reason}`
      );
      this.state.conversationHistory.push({
        role: 'assistant',
        content: `Note: ${skippedDuplicates.length} duplicate tool call(s) were skipped:\n${skippedMessages.join('\n')}`,
      });
    }

    // Process only unique tool calls
    for (const toolCall of uniqueToolCalls) {
      // Emit LLM proposed tool call event
      await this.config.eventEmitter.emit<LLMProposedToolCallPayload>(
        LLMProposalEventType.LLM_PROPOSED_TOOL_CALL,
        {
          tool_name: toolCall.name,
          arguments: toolCall.arguments,
        }
      );

      // Validate tool call
      const validationResult = await this.validateToolCall(toolCall);
      if (!validationResult.valid) {
        // Validation failed - add error to conversation and continue
        this.state.conversationHistory.push({
          role: 'assistant',
          content: `Tool call validation failed: ${validationResult.error}`,
        });
        continue;
      }

      // Execute tool
      const startTime = Date.now();
      let toolResult: unknown;
      let toolError: string | undefined;

      try {
        toolResult = await this.config.mcpClientManager.executeTool(
          toolCall.name,
          toolCall.arguments,
          this.config.executionMode
        );
      } catch (error) {
        toolError = error instanceof Error ? error.message : String(error);
        toolResult = { error: toolError };
      }

      const duration = Date.now() - startTime;

      // Calculate result size
      const resultSize = Buffer.byteLength(JSON.stringify(toolResult), 'utf8');

      // Track tool call
      const toolCallInfo: ToolCallInfo = {
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
        result: toolResult,
        timestamp: new Date(),
        duration,
      };

      // Externalize large results
      if (DataManager.shouldExternalize(resultSize) && !toolError) {
        const dataId = this.dataManager.store(toolResult, toolCall.name);
        toolCallInfo.resultReference = dataId;
        // Clear result from memory (keep reference only)
        delete toolCallInfo.result;

        // Add truncated message to conversation history
        const sizeDisplay = DataManager.formatSize(resultSize);
        this.state.conversationHistory.push({
          role: 'assistant',
          content: `Tool ${toolCall.name} executed. Large result (${sizeDisplay}) stored externally. Reference: ${dataId}`,
        });

        // Store reference in results for LLM (will need to load if needed)
        results.push({
          tool_name: toolCall.name,
          arguments: toolCall.arguments,
          result: {
            _dataReference: dataId,
            _message: `Large result (${sizeDisplay}) stored externally. Use reference ${dataId} to load.`,
          },
          duration_ms: duration,
        });
      } else {
        // Small result: store normally
        results.push({
          tool_name: toolCall.name,
          arguments: toolCall.arguments,
          result: toolResult,
          duration_ms: duration,
        });

        // Add tool result to conversation history (truncate if needed)
        const resultText =
          typeof toolResult === 'string'
            ? toolResult
            : JSON.stringify(toolResult, null, 2);

        // Truncate if too large
        const truncatedResult =
          resultText.length > this.MAX_MESSAGE_SIZE
            ? resultText.substring(0, this.MAX_MESSAGE_SIZE) +
              '\n[... truncated, result too large]'
            : resultText;

        this.state.conversationHistory.push({
          role: 'assistant',
          content: `Tool ${toolCall.name} executed${toolError ? ` with error: ${toolError}` : ''}. Result: ${truncatedResult}`,
        });
      }

      // Always add toolCallInfo to state (with or without result)
      this.state.toolCalls.push(toolCallInfo);
      this.state.totalToolCalls++;
    }

    return results;
  }

  /**
   * Validate a tool call.
   */
  private async validateToolCall(toolCall: ToolCall): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Emit validation started event
    await this.config.eventEmitter.emit<ToolCallValidationStartedPayload>(
      ValidationEventType.TOOL_CALL_VALIDATION_STARTED,
      {
        tool_name: toolCall.name,
        arguments: toolCall.arguments,
        validation_rules: ['tool_exists', 'required_fields'],
      }
    );

    // Find the tool definition
    const toolDef = this.availableTools.find(
      tool => tool.name === toolCall.name
    );

    if (!toolDef) {
      const error = `Tool "${toolCall.name}" not found`;
      await this.config.eventEmitter.emit<ToolCallValidationFailedPayload>(
        ValidationEventType.TOOL_CALL_VALIDATION_FAILED,
        {
          tool_name: toolCall.name,
          arguments: toolCall.arguments,
          failure_reason: error,
          validation_errors: [
            {
              message: error,
              code: 'TOOL_NOT_FOUND',
            },
          ],
        }
      );
      return { valid: false, error };
    }

    // Basic validation - check if required fields are present
    // More sophisticated validation can be added later
    const schema = toolDef.inputSchema as {
      type?: string;
      properties?: Record<
        string,
        {
          type?: string | string[];
          description?: string;
          enum?: unknown[];
          format?: string;
          items?: { type?: string };
          [key: string]: unknown;
        }
      >;
      required?: string[];
    };

    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in toolCall.arguments)) {
          // Extract field information from schema
          const fieldDef = schema.properties?.[requiredField];
          const fieldType = this.formatFieldType(fieldDef);
          const fieldDescription = fieldDef?.description;

          // Build comprehensive error message
          let error = `Missing required field: "${requiredField}"`;
          if (fieldType) {
            error += `\n  Expected type: ${fieldType}`;
          }
          if (fieldDescription) {
            error += `\n  Description: ${fieldDescription}`;
          }
          if (fieldDef?.enum) {
            const enumValues = fieldDef.enum
              .map(v => (typeof v === 'string' ? `"${v}"` : String(v)))
              .join(', ');
            error += `\n  Allowed values: ${enumValues}`;
          }
          if (fieldDef?.format) {
            error += `\n  Format: ${fieldDef.format}`;
          }
          await this.config.eventEmitter.emit<ToolCallValidationFailedPayload>(
            ValidationEventType.TOOL_CALL_VALIDATION_FAILED,
            {
              tool_name: toolCall.name,
              arguments: toolCall.arguments,
              failure_reason: error,
              validation_errors: [
                {
                  field: requiredField,
                  message: error,
                  code: 'MISSING_REQUIRED_ARGUMENT',
                },
              ],
            }
          );
          return { valid: false, error };
        }
      }
    }

    // Validation passed
    await this.config.eventEmitter.emit<ToolCallValidationPassedPayload>(
      ValidationEventType.TOOL_CALL_VALIDATION_PASSED,
      {
        tool_name: toolCall.name,
        arguments: toolCall.arguments,
        validated_at: new Date().toISOString(),
      }
    );

    return { valid: true };
  }

  /**
   * Format field type information for error messages.
   */
  private formatFieldType(fieldDef?: {
    type?: string | string[];
    items?: { type?: string };
    [key: string]: unknown;
  }): string | null {
    if (!fieldDef) {
      return null;
    }

    const type = fieldDef.type;
    if (!type) {
      return null;
    }

    // Handle array types
    if (Array.isArray(type)) {
      return type.join(' | ');
    }

    // Handle object type (could be a complex object)
    if (type === 'object') {
      return 'object';
    }

    // Handle array of items
    if (type === 'array') {
      const itemsType = fieldDef.items?.type;
      if (itemsType) {
        return `array<${itemsType}>`;
      }
      return 'array';
    }

    return type;
  }

  /**
   * Build prompt after tool execution.
   */
  private buildPostToolPrompt(
    _toolCalls: ToolCall[],
    _toolResults: Array<{
      tool_name: string;
      arguments: Record<string, unknown>;
      result: unknown;
      duration_ms: number;
    }>
  ): { messages: LLMMessage[] } {
    // The conversation history already includes tool results
    // Just return the current state
    return {
      messages: [...this.state.conversationHistory],
    };
  }

  /**
   * Get session state.
   */
  getState(): DevSessionState {
    return { ...this.state };
  }

  /**
   * Get available tools.
   */
  getAvailableTools(): ToolDefinition[] {
    return [...this.availableTools];
  }

  /**
   * Complete the session.
   */
  async complete(): Promise<void> {
    const duration = Date.now() - this.state.startTime.getTime();

    await this.config.eventEmitter.emit<SessionCompletedPayload>(
      SessionLifecycleEventType.SESSION_COMPLETED,
      {
        status: 'success',
        duration_ms: duration,
        total_tool_calls: this.state.totalToolCalls,
        total_llm_calls: this.state.totalLLMCalls,
      }
    );
  }

  /**
   * Halt the session due to error.
   */
  async halt(reason: string, errorCode?: string): Promise<void> {
    await this.config.eventEmitter.emit<SessionHaltedPayload>(
      SessionLifecycleEventType.SESSION_HALTED,
      {
        reason,
        error_code: errorCode,
      }
    );
  }

  /**
   * Clear conversation history.
   */
  clearHistory(): void {
    this.state.conversationHistory = [];
  }

  /**
   * Get tool result (loads from file if large data was externalized).
   */
  getToolResult(toolCallInfo: ToolCallInfo): unknown {
    if (toolCallInfo.resultReference) {
      return this.dataManager.load(toolCallInfo.resultReference);
    }
    return toolCallInfo.result;
  }

  /**
   * Get the data manager instance.
   */
  getDataManager(): DataManager {
    return this.dataManager;
  }
}
