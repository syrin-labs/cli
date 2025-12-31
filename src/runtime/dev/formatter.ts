/**
 * Output formatter for Dev Mode.
 * Formats all output for developer-friendly display.
 */

import { Icons, Labels } from '@/constants';
import type { DevSessionState } from './types';
import type { ToolCall } from '@/runtime/llm/types';
import type { TransportType } from '@/config/types';
import type { MCPURL, Command } from '@/types/ids';
import { log } from '@/utils/logger';

/**
 * Formatter options.
 */
export interface FormatterOptions {
  /** Whether to use colors */
  useColors?: boolean;
  /** Whether to truncate long outputs */
  truncateLongOutputs?: boolean;
  /** Maximum length before truncation */
  maxOutputLength?: number;
}

/**
 * Dev Mode output formatter.
 */
export class DevFormatter {
  constructor(private readonly options: FormatterOptions = {}) {
    this.options.useColors = options.useColors ?? true;
    this.options.truncateLongOutputs = options.truncateLongOutputs ?? true;
    this.options.maxOutputLength = options.maxOutputLength ?? 500;
  }

  /**
   * Format and display the dev mode header.
   */
  displayHeader(
    version: string,
    transport: TransportType,
    mcpUrl: MCPURL | string | undefined,
    command: Command | string | undefined,
    llmProvider: string,
    toolCount: number
  ): void {
    log.blank();
    log.success(`${Icons.SUCCESS} Syrin Version: ${version}`);
    log.blank();

    log.plain(`${Labels.TRANSPORT_LAYER}: ${transport}`);

    if (transport === 'http' && mcpUrl) {
      log.plain(`${Labels.MCP_URL}: ${mcpUrl} ${Icons.CHECK} (working)`);
    } else if (transport === 'stdio' && command) {
      log.plain(`${Labels.COMMAND}: ${command} ${Icons.CHECK} (working)`);
    }

    log.plain(`LLM: ${llmProvider}`);
    log.blank();
    log.plain(`Total Tools: ${toolCount}`);
    log.blank();
  }

  /**
   * Format and display user input.
   */
  displayUserInput(input: string): void {
    log.blank();
    log.success(`${Icons.SUCCESS} User > ${input}`);
    log.blank();
  }

  /**
   * Format and display detected tool calls.
   */
  displayToolDetection(toolCalls: ToolCall[]): void {
    if (toolCalls.length === 0) {
      return;
    }

    for (const toolCall of toolCalls) {
      log.plain(`Detected Tool: ${toolCall.name}`);
      log.plain('Detected Arguments:');
      log.plain(JSON.stringify(toolCall.arguments, null, 2));
      log.blank();
    }
  }

  /**
   * Format and display tool execution start.
   */
  displayToolExecutionStart(toolName: string): void {
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    log.plain(`Calling Tool (${toolName})`);
    log.blank();
    log.plain(`Tool Logs (${toolName}):`);
    log.plain(`[${timestamp} > ${toolName}] Tool calling started!`);
  }

  /**
   * Format and display tool execution end.
   */
  displayToolExecutionEnd(toolName: string, duration: number): void {
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    log.plain(
      `[${timestamp} > ${toolName}] Tool calling ended! (${duration}ms)`
    );
  }

  /**
   * Format and display tool execution result.
   */
  displayToolResult(toolName: string, result: unknown): void {
    log.blank();
    log.plain(`Returned Tool Response (${toolName}):`);

    let resultText: string;
    if (typeof result === 'string') {
      resultText = result;
    } else if (result && typeof result === 'object') {
      // Check if it's a preview result
      if ('preview' in result && (result as { preview?: boolean }).preview) {
        resultText = JSON.stringify(result, null, 2);
      } else {
        resultText = JSON.stringify(result, null, 2);
      }
    } else {
      resultText = String(result);
    }

    // Truncate if needed
    if (
      this.options.truncateLongOutputs &&
      resultText.length > this.options.maxOutputLength!
    ) {
      resultText =
        resultText.substring(0, this.options.maxOutputLength) +
        '\n... (truncated)';
    }

    log.plain(resultText);
    log.blank();
  }

  /**
   * Format and display tool execution error.
   */
  displayToolError(toolName: string, error: string): void {
    log.blank();
    log.error(`Tool Execution Error (${toolName}):`);
    log.plain(error);
    log.blank();
  }

  /**
   * Format and display LLM response.
   */
  displayLLMResponse(llmProvider: string, response: string): void {
    log.blank();
    log.success(`${Icons.SUCCESS} LLM Response (${llmProvider}):`);

    // Split response into lines for better readability
    const lines = response.split('\n');
    for (const line of lines) {
      log.plain(line);
    }
    log.blank();
  }

  /**
   * Format and display session summary.
   */
  displaySessionSummary(state: DevSessionState): void {
    const duration = Date.now() - state.startTime.getTime();
    const durationSeconds = (duration / 1000).toFixed(2);

    log.blank();
    log.plain('─'.repeat(60));
    log.plain('Session Summary:');
    log.plain(`  Duration: ${durationSeconds}s`);
    log.plain(`  Total Tool Calls: ${state.totalToolCalls}`);
    log.plain(`  Total LLM Calls: ${state.totalLLMCalls}`);
    log.plain('─'.repeat(60));
    log.blank();
  }

  /**
   * Format and display available tools list.
   */
  displayToolsList(tools: Array<{ name: string; description?: string }>): void {
    log.blank();
    log.plain('Available Tools:');
    log.plain('─'.repeat(60));

    if (tools.length === 0) {
      log.warning(`  ${Icons.WARNING} No tools available`);
      return;
    }

    for (const tool of tools) {
      log.plain(`  ${Icons.CHECK} ${tool.name}`);
      if (tool.description) {
        log.plain(`    ${tool.description}`);
      }
    }
    log.blank();
  }

  /**
   * Format and display welcome message.
   */
  displayWelcomeMessage(): void {
    log.blank();
    log.success(
      `${Icons.SUCCESS} Syrin's Dev Mode Entered. Talk to the LLM Now!`
    );
    log.blank();
  }

  /**
   * Format and display server log message.
   */
  displayServerLog(type: 'stdout' | 'stderr', message: string): void {
    const label = type === 'stderr' ? '[Server Error]' : '[Server]';
    if (type === 'stderr') {
      log.error(`${label} ${message}`);
    } else {
      log.info(`${label} ${message}`);
    }
  }

  /**
   * Format and display error message.
   */
  displayError(message: string): void {
    log.blank();
    log.error(message);
    log.blank();
  }

  /**
   * Format and display info message.
   */
  displayInfo(message: string): void {
    log.blank();
    log.info(message);
    log.blank();
  }

  /**
   * Format JSON for display.
   */
  formatJSON(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  /**
   * Truncate text if it's too long.
   */
  truncate(text: string, maxLength?: number): string {
    const length = maxLength || this.options.maxOutputLength || 500;
    if (text.length <= length) {
      return text;
    }
    return text.substring(0, length) + '\n... (truncated)';
  }
}
