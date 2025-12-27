/**
 * Output formatter for Dev Mode.
 * Formats all output for developer-friendly display.
 */

import { Icons, Labels } from '@/constants';
import type { DevSessionState } from './types';
import type { ToolCall } from '@/runtime/llm/types';
import type { TransportType } from '@/config/types';
import type { MCPURL, Command } from '@/types/ids';

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
    console.log(`\n${Icons.SUCCESS} Syrin Version: ${version}\n`);

    console.log(`${Labels.TRANSPORT_LAYER}: ${transport}`);

    if (transport === 'http' && mcpUrl) {
      console.log(`${Labels.MCP_URL}: ${mcpUrl} ${Icons.CHECK} (working)`);
    } else if (transport === 'stdio' && command) {
      console.log(`${Labels.COMMAND}: ${command} ${Icons.CHECK} (working)`);
    }

    console.log(`LLM: ${llmProvider}`);
    console.log(`\nTotal Tools: ${toolCount}\n`);
  }

  /**
   * Format and display user input.
   */
  displayUserInput(input: string): void {
    console.log(`\n${Icons.SUCCESS} User > ${input}\n`);
  }

  /**
   * Format and display detected tool calls.
   */
  displayToolDetection(toolCalls: ToolCall[]): void {
    if (toolCalls.length === 0) {
      return;
    }

    for (const toolCall of toolCalls) {
      console.log(`Detected Tool: ${toolCall.name}`);
      console.log('Detected Arguments:');
      console.log(JSON.stringify(toolCall.arguments, null, 2));
      console.log('');
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
    console.log(`Calling Tool (${toolName})`);
    console.log(`\nTool Logs (${toolName}):`);
    console.log(`[${timestamp} > ${toolName}] Tool calling started!`);
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
    console.log(
      `[${timestamp} > ${toolName}] Tool calling ended! (${duration}ms)`
    );
  }

  /**
   * Format and display tool execution result.
   */
  displayToolResult(toolName: string, result: unknown): void {
    console.log(`\nReturned Tool Response (${toolName}):`);

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

    console.log(resultText);
    console.log('');
  }

  /**
   * Format and display tool execution error.
   */
  displayToolError(toolName: string, error: string): void {
    console.log(`\n${Icons.ERROR} Tool Execution Error (${toolName}):`);
    console.log(error);
    console.log('');
  }

  /**
   * Format and display LLM response.
   */
  displayLLMResponse(llmProvider: string, response: string): void {
    console.log(`\n${Icons.SUCCESS} LLM Response (${llmProvider}):`);

    // Split response into lines for better readability
    const lines = response.split('\n');
    for (const line of lines) {
      console.log(line);
    }
    console.log('');
  }

  /**
   * Format and display session summary.
   */
  displaySessionSummary(state: DevSessionState): void {
    const duration = Date.now() - state.startTime.getTime();
    const durationSeconds = (duration / 1000).toFixed(2);

    console.log('\n' + '─'.repeat(60));
    console.log('Session Summary:');
    console.log(`  Duration: ${durationSeconds}s`);
    console.log(`  Total Tool Calls: ${state.totalToolCalls}`);
    console.log(`  Total LLM Calls: ${state.totalLLMCalls}`);
    console.log('─'.repeat(60) + '\n');
  }

  /**
   * Format and display available tools list.
   */
  displayToolsList(tools: Array<{ name: string; description?: string }>): void {
    console.log('\nAvailable Tools:');
    console.log('─'.repeat(60));

    if (tools.length === 0) {
      console.log(`  ${Icons.WARNING} No tools available`);
      return;
    }

    for (const tool of tools) {
      console.log(`  ${Icons.CHECK} ${tool.name}`);
      if (tool.description) {
        console.log(`    ${tool.description}`);
      }
    }
    console.log('');
  }

  /**
   * Format and display welcome message.
   */
  displayWelcomeMessage(): void {
    console.log(
      `\n${Icons.SUCCESS} Syrin's Dev Mode Entered. Talk to the LLM Now!\n`
    );
  }

  /**
   * Format and display server log message.
   */
  displayServerLog(type: 'stdout' | 'stderr', message: string): void {
    const prefix = type === 'stderr' ? Icons.ERROR : Icons.TIP;
    const label = type === 'stderr' ? '[Server Error]' : '[Server]';
    console.log(`${prefix} ${label} ${message}`);
  }

  /**
   * Format and display error message.
   */
  displayError(message: string): void {
    console.error(`\n${Icons.ERROR} ${message}\n`);
  }

  /**
   * Format and display info message.
   */
  displayInfo(message: string): void {
    console.log(`\n${Icons.TIP} ${message}\n`);
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
