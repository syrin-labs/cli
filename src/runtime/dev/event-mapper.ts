/**
 * Dev Mode Event Mapper.
 * Maps runtime events to UI messages for incremental visibility in dev mode.
 * Uses the generic event subscriber pattern for decoupling.
 */

import type { EventEmitter, EventSubscriber } from '@/events/emitter';
import type { EventEnvelope } from '@/events/types';
import {
  LLMProposalEventType,
  ValidationEventType,
  ToolExecutionEventType,
  TransportEventType,
  LLMContextEventType,
} from '@/events/event-type';
import type { LLMProposedToolCallPayload } from '@/events/payloads/llm';
import type {
  ToolCallValidationStartedPayload,
  ToolCallValidationPassedPayload,
  ToolCallValidationFailedPayload,
} from '@/events/payloads/validation';
import type {
  ToolExecutionStartedPayload,
  ToolExecutionCompletedPayload,
  ToolExecutionFailedPayload,
} from '@/events/payloads/tool';
import type {
  TransportMessageSentPayload,
  TransportMessageReceivedPayload,
} from '@/events/payloads/transport';
import type {
  PostToolLLMPromptBuiltPayload,
  LLMFinalResponseGeneratedPayload,
} from '@/events/payloads/llm';
import type { ChatUI } from '@/presentation/dev/chat-ui';
import { DataManager } from './data-manager';

/**
 * Dev Event Mapper.
 * Subscribes to events and updates the ChatUI incrementally.
 */
export class DevEventMapper {
  private unsubscribe: (() => void) | null = null;
  private readonly executionIdToToolName = new Map<string, string>();
  private readonly executionIdToArguments = new Map<
    string,
    Record<string, unknown>
  >(); // Track arguments for duplicate detection
  private readonly waitingMessageIdToRequestDetails = new Map<string, string>(); // Store request details for each waiting message
  private readonly proposedToolArguments = new Map<
    string,
    Record<string, unknown>
  >(); // Track proposed tool arguments
  private readonly executionOrder: string[] = []; // Track execution order for indexing
  private validationPending = new Map<string, boolean>(); // Track validation state
  private validationRules = new Map<string, string[]>(); // Store validation rules per tool
  private readonly waitingStartTimes = new Map<string, number>(); // Track start time to calculate elapsed when response arrives

  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly chatUI: ChatUI,
    private readonly llmProviderName: string = 'LLM'
  ) {}

  /**
   * Start listening to events and updating the UI.
   */
  start(): void {
    if (!this.eventEmitter.subscribe) {
      // Event emitter doesn't support subscriptions (shouldn't happen with RuntimeEventEmitter)
      return;
    }

    const subscriber: EventSubscriber = (event: EventEnvelope) => {
      this.handleEvent(event);
    };

    this.unsubscribe = this.eventEmitter.subscribe(subscriber);
  }

  /**
   * Stop listening to events.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // Clear all waiting and generation start times (no timers to clear)
    this.waitingStartTimes.clear();
    this.executionIdToToolName.clear();
    this.executionIdToArguments.clear();
    this.proposedToolArguments.clear();
    this.validationPending.clear();
    this.validationRules.clear();
    this.executionOrder.length = 0; // Clear array
  }

  /**
   * Handle an event and update the UI accordingly.
   */
  private handleEvent(event: EventEnvelope): void {
    switch (event.event_type) {
      case LLMProposalEventType.LLM_PROPOSED_TOOL_CALL:
        this.handleToolProposed(
          event as EventEnvelope<LLMProposedToolCallPayload>
        );
        break;

      case ValidationEventType.TOOL_CALL_VALIDATION_STARTED:
        this.handleValidationStarted(
          event as EventEnvelope<ToolCallValidationStartedPayload>
        );
        break;

      case ValidationEventType.TOOL_CALL_VALIDATION_PASSED:
        this.handleValidationPassed(
          event as EventEnvelope<ToolCallValidationPassedPayload>
        );
        break;

      case ValidationEventType.TOOL_CALL_VALIDATION_FAILED:
        this.handleValidationFailed(
          event as EventEnvelope<ToolCallValidationFailedPayload>
        );
        break;

      case ToolExecutionEventType.TOOL_EXECUTION_STARTED:
        this.handleToolExecutionStarted(
          event as EventEnvelope<ToolExecutionStartedPayload>
        );
        break;

      case TransportEventType.TRANSPORT_MESSAGE_SENT:
        this.handleTransportMessageSent(
          event as EventEnvelope<TransportMessageSentPayload>
        );
        break;

      case TransportEventType.TRANSPORT_MESSAGE_RECEIVED:
        this.handleTransportMessageReceived(
          event as EventEnvelope<TransportMessageReceivedPayload>
        );
        break;

      case ToolExecutionEventType.TOOL_EXECUTION_COMPLETED:
        this.handleToolExecutionCompleted(
          event as EventEnvelope<ToolExecutionCompletedPayload>
        );
        break;

      case ToolExecutionEventType.TOOL_EXECUTION_FAILED:
        this.handleToolExecutionFailed(
          event as EventEnvelope<ToolExecutionFailedPayload>
        );
        break;

      case LLMContextEventType.POST_TOOL_LLM_PROMPT_BUILT:
        this.handlePostToolLLMPromptBuilt(
          event as EventEnvelope<PostToolLLMPromptBuiltPayload>
        );
        break;

      case LLMProposalEventType.LLM_FINAL_RESPONSE_GENERATED:
        this.handleLLMFinalResponseGenerated(
          event as EventEnvelope<LLMFinalResponseGeneratedPayload>
        );
        break;

      default:
        // Ignore other event types for now
        break;
    }
  }

  /**
   * Handle LLM proposed tool call event.
   */
  private handleToolProposed(
    event: EventEnvelope<LLMProposedToolCallPayload>
  ): void {
    const payload = event.payload;
    // Store proposed arguments for comparison later
    this.proposedToolArguments.set(payload.tool_name, payload.arguments);

    const argsJson = this.formatArgumentsForDisplay(payload.arguments);
    this.chatUI.addMessage(
      'system',
      `🔧 **Tool Selected**: \`${payload.tool_name}\`\n**Arguments**:\n\`\`\`json\n${argsJson}\n\`\`\``
    );
  }

  /**
   * Handle tool call validation started event.
   * Consolidate with validation passed - just mark as pending.
   */
  private handleValidationStarted(
    event: EventEnvelope<ToolCallValidationStartedPayload>
  ): void {
    const payload = event.payload;
    // Store validation pending state - will be updated when passed
    this.validationPending.set(payload.tool_name, true);
    // Store validation rules to display when validation passes
    this.validationRules.set(payload.tool_name, payload.validation_rules);
  }

  /**
   * Handle tool call validation passed event.
   * Consolidated with validation started - show single message with validation details.
   */
  private handleValidationPassed(
    event: EventEnvelope<ToolCallValidationPassedPayload>
  ): void {
    const payload = event.payload;
    const rules = this.validationRules.get(payload.tool_name) || [];

    // Format validation rules for display
    let validationDetails = '';
    if (rules.length > 0) {
      const rulesList = rules.map(rule => `  • ${rule}`).join('\n');
      validationDetails = `\n**Checks passed**:\n${rulesList}`;
    } else {
      // Fallback message if no rules available
      validationDetails =
        '\n**Checks passed**: Parameter validation, data type matching';
    }

    this.chatUI.addMessage(
      'system',
      `✓ Validated: \`${payload.tool_name}\`${validationDetails}`
    );
    this.validationPending.delete(payload.tool_name);
    this.validationRules.delete(payload.tool_name);
  }

  /**
   * Handle tool call validation failed event.
   */
  private handleValidationFailed(
    event: EventEnvelope<ToolCallValidationFailedPayload>
  ): void {
    const payload = event.payload;

    // Format each validation error with better structure
    const errors = payload.validation_errors
      .map(err => {
        // If the message contains newlines, it's already formatted with details
        // Otherwise, format it simply
        if (err.message.includes('\n')) {
          // Multi-line error message - format with proper indentation
          const lines = err.message.split('\n');
          const firstLine = lines[0];
          const details = lines
            .slice(1)
            .map(line => `    ${line}`)
            .join('\n');
          return `  • ${firstLine}\n${details}`;
        }
        // Simple error message
        return `  • ${err.message} (${err.code})`;
      })
      .join('\n\n');

    this.chatUI.addMessage(
      'system',
      `❌ Validation failed for **${payload.tool_name}**:\n\n${errors}`
    );
  }

  /**
   * Handle tool execution started event.
   */
  private handleToolExecutionStarted(
    event: EventEnvelope<ToolExecutionStartedPayload>
  ): void {
    const payload = event.payload;
    // Store mapping for later use
    this.executionIdToToolName.set(payload.execution_id, payload.tool_name);
    this.executionIdToArguments.set(payload.execution_id, payload.arguments);
    // Track execution order for indexing
    if (!this.executionOrder.includes(payload.execution_id)) {
      this.executionOrder.push(payload.execution_id);
    }

    // Check if arguments are same as the proposed tool call
    const proposedArgs = this.proposedToolArguments.get(payload.tool_name);
    const argsAreSame =
      proposedArgs &&
      JSON.stringify(proposedArgs, Object.keys(proposedArgs).sort()) ===
        JSON.stringify(
          payload.arguments,
          Object.keys(payload.arguments).sort()
        );

    if (argsAreSame) {
      // Arguments are same - just show executing message
      this.chatUI.addMessage(
        'system',
        `🚀 **Executing**: \`${payload.tool_name}\``
      );
    } else {
      // Arguments differ - show parameters
      const argsJson = this.formatArgumentsForDisplay(payload.arguments);
      this.chatUI.addMessage(
        'system',
        `🚀 **Executing**: \`${payload.tool_name}\`\n**Parameters**:\n\`\`\`json\n${argsJson}\n\`\`\``
      );
    }
  }

  /**
   * Handle transport message sent event.
   */
  private handleTransportMessageSent(
    event: EventEnvelope<TransportMessageSentPayload>
  ): void {
    const payload = event.payload;
    if (payload.message_type === 'tools/call') {
      const sizeDisplay = DataManager.formatSize(payload.size_bytes);
      const messageId = `waiting-${Date.now()}-${Math.random()}`;
      const startTime = Date.now();

      // Store start time for calculating elapsed time when response arrives
      this.waitingStartTimes.set(messageId, startTime);

      // Format request details
      let requestDetails = `📤 **Request sent** to MCP server (${sizeDisplay})`;

      if (payload.tool_name) {
        requestDetails += `\n\n**Tool:** \`${payload.tool_name}\``;
        requestDetails += `\n**Type:** ${payload.message_type}`;

        if (payload.tool_arguments) {
          const argsStr = JSON.stringify(payload.tool_arguments, null, 2);
          // Truncate very long arguments (over 500 chars) to keep display manageable
          const truncatedArgs =
            argsStr.length > 500
              ? argsStr.substring(0, 500) + '\n... (truncated)'
              : argsStr;
          requestDetails += `\n**Arguments:**\n\`\`\`json\n${truncatedArgs}\n\`\`\``;
        }
      }

      // Store request details for later use when updating the message
      this.waitingMessageIdToRequestDetails.set(messageId, requestDetails);

      requestDetails += `\n\n⏳ **Waiting** for response...`;

      // Add static waiting message (no live updates to prevent scroll jumping)
      this.chatUI.addMessage('system', requestDetails);
    }
  }

  /**
   * Handle transport message received event.
   */
  private handleTransportMessageReceived(
    event: EventEnvelope<TransportMessageReceivedPayload>
  ): void {
    const payload = event.payload;
    if (payload.message_type === 'tools/call_response') {
      const sizeDisplay = DataManager.formatSize(payload.size_bytes);

      // Calculate elapsed time and update the waiting message with final response
      if (this.waitingStartTimes.size > 0) {
        // Get the last (most recent) waiting start time
        const startTimeEntries = Array.from(this.waitingStartTimes.entries());
        const lastEntry = startTimeEntries[startTimeEntries.length - 1];
        if (lastEntry) {
          const [messageId, startTime] = lastEntry;

          // Calculate final elapsed time
          const elapsed = (Date.now() - startTime) / 1000;
          const elapsedStr =
            elapsed < 1 ? `${elapsed.toFixed(1)}s` : `${Math.floor(elapsed)}s`;

          // Get stored request details and append response info
          const requestDetails =
            this.waitingMessageIdToRequestDetails.get(messageId) ||
            `📤 **Request sent** to MCP server (${sizeDisplay})`;

          const fullMessage = `${requestDetails}\n\n📥 **Response received** from MCP server (${sizeDisplay}) - ${elapsedStr}`;

          // Update the waiting message with final response time (only one state update)
          this.chatUI.updateLastSystemMessage(fullMessage);

          // Clean up stored data
          this.waitingStartTimes.delete(messageId);
          this.waitingMessageIdToRequestDetails.delete(messageId);
        }
      } else {
        // Fallback: if no timer found, just add a new message
        this.chatUI.addMessage(
          'system',
          `📥 Response received from MCP server (${sizeDisplay})`
        );
      }
    }
  }

  /**
   * Handle tool execution completed event.
   */
  private handleToolExecutionCompleted(
    event: EventEnvelope<ToolExecutionCompletedPayload>
  ): void {
    const payload = event.payload;
    const toolName =
      this.executionIdToToolName.get(payload.execution_id) || payload.tool_name;

    // Get tool call index (1-based for user convenience)
    const executionIndex = this.executionOrder.indexOf(payload.execution_id);
    const toolIndex = executionIndex >= 0 ? executionIndex + 1 : null;

    // Format result preview (truncate if large)
    const resultPreview = this.formatResultPreview(payload.result, toolIndex);
    const duration = payload.duration_ms;
    const durationStr =
      duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;

    let resultSection = '';
    if (resultPreview.json) {
      resultSection = `\n**Result**:\n\`\`\`json\n${resultPreview.json}\n\`\`\``;
      if (resultPreview.truncated) {
        resultSection += `\n${resultPreview.truncated}`;
      }
    }

    this.chatUI.addMessage(
      'system',
      `✅ **Tool Response**: \`${toolName}\` completed (${durationStr})${resultSection}`
    );

    // Clean up mapping (but keep in executionOrder for indexing)
    this.executionIdToToolName.delete(payload.execution_id);
  }

  /**
   * Handle tool execution failed event.
   */
  private handleToolExecutionFailed(
    event: EventEnvelope<ToolExecutionFailedPayload>
  ): void {
    const payload = event.payload;
    const toolName =
      this.executionIdToToolName.get(payload.execution_id) || payload.tool_name;
    const duration = payload.duration_ms;

    // Clear waiting timer if it exists (timeouts/failures don't emit TRANSPORT_MESSAGE_RECEIVED)
    this.clearMostRecentWaitingTimer();

    this.chatUI.addMessage(
      'system',
      `❌ **${toolName}** failed (${duration}ms)\nError: ${payload.error.message} (${payload.error.code})`
    );

    // Clean up mapping
    this.executionIdToToolName.delete(payload.execution_id);
  }

  /**
   * Clear the most recent waiting timer.
   * Used when a tool execution completes (success) or fails (timeout/error).
   */
  private clearMostRecentWaitingTimer(): void {
    if (this.waitingStartTimes.size > 0) {
      // Get the last (most recent) waiting start time
      const startTimeEntries = Array.from(this.waitingStartTimes.entries());
      const lastEntry = startTimeEntries[startTimeEntries.length - 1];
      if (lastEntry) {
        const [messageId] = lastEntry;

        // Clear the start time (no timer to clear since we don't use live updates)
        this.waitingStartTimes.delete(messageId);
      }
    }
  }

  /**
   * Handle post-tool LLM prompt built event.
   * This happens after tool execution, when LLM is about to generate a response.
   */
  private handlePostToolLLMPromptBuilt(
    _event: EventEnvelope<PostToolLLMPromptBuiltPayload>
  ): void {
    // Simply add a static message - no tracking needed
    this.chatUI.addMessage(
      'system',
      `🤖 **${this.llmProviderName}** generating response...`
    );
  }

  /**
   * Handle LLM final response generated event.
   * This happens when LLM has finished generating the response.
   */
  private handleLLMFinalResponseGenerated(
    _event: EventEnvelope<LLMFinalResponseGeneratedPayload>
  ): void {
    // No-op: The static message is sufficient, no need to update it
  }

  /**
   * Format arguments for display with JSON formatting.
   */
  private formatArgumentsForDisplay(args: Record<string, unknown>): string {
    if (Object.keys(args).length === 0) {
      return '{}';
    }

    try {
      const formatted = JSON.stringify(args, null, 2);
      // Truncate if too long
      if (formatted.length > 300) {
        return formatted.substring(0, 300) + '\n... (truncated)';
      }
      return formatted;
    } catch {
      try {
        return JSON.stringify(args);
      } catch {
        return '[Unable to format arguments]';
      }
    }
  }

  /**
   * Format result preview for display.
   */
  private formatResultPreview(
    result: unknown,
    toolIndex: number | null = null
  ): { json: string; truncated?: string } {
    if (result === null || result === undefined) {
      return { json: 'null' };
    }

    try {
      // Parse string as JSON if needed, then stringify with formatting
      let parsedResult: unknown = result;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result);
        } catch {
          // Not JSON, use as-is
          parsedResult = result;
        }
      }

      // Format as JSON with indentation
      const formattedJson = JSON.stringify(parsedResult, null, 2);
      const maxPreviewLength = 500; // Increased from 300 for better preview

      // Truncate if too long
      if (formattedJson.length > maxPreviewLength) {
        // Find a good truncation point (end of a line)
        let truncateAt = maxPreviewLength;
        const lastNewline = formattedJson.lastIndexOf('\n', maxPreviewLength);
        if (lastNewline > maxPreviewLength * 0.7) {
          // If we find a newline in the last 30%, use it for cleaner truncation
          truncateAt = lastNewline;
        }

        const preview = formattedJson.substring(0, truncateAt);
        const saveHint =
          toolIndex !== null
            ? `💡 Result truncated. Use \`/save-json ${toolIndex}\` to save the full data to a file.`
            : '💡 Result truncated. Use `/save-json` to save the full data to a file.';

        return { json: `${preview}\n... (truncated)`, truncated: saveHint };
      }

      return { json: formattedJson };
    } catch {
      try {
        const fallback = JSON.stringify(result);
        if (fallback.length > 500) {
          const saveHint =
            toolIndex !== null
              ? `💡 Result truncated. Use \`/save-json ${toolIndex}\` to save the full data to a file.`
              : '💡 Result truncated. Use `/save-json` to save the full data to a file.';
          return {
            json: fallback.substring(0, 500) + '\n... (truncated)',
            truncated: saveHint,
          };
        }
        return { json: fallback };
      } catch {
        return { json: '[Unable to format result]' };
      }
    }
  }
}
