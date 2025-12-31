/**
 * Presentation utilities for dev command.
 * Separates UI/logic concerns by providing functions for displaying messages.
 */

import { Messages, TransportTypes } from '@/constants';
import { checkVersion, getCurrentVersion } from '@/utils/version-checker';

/**
 * Build initial welcome messages for dev mode.
 */
export async function buildDevWelcomeMessages(options: {
  version: string;
  llmProvider: string;
  toolCount: number;
  transport: string;
  mcpUrl?: string;
  command?: string;
}): Promise<Array<{ role: 'system'; content: string }>> {
  // Get version info for display
  const currentVersion = options.version ?? getCurrentVersion();
  const versionInfo = await checkVersion('@ankan-ai/syrin');
  const versionDisplayString =
    versionInfo.isLatest || !versionInfo.latest
      ? `v${currentVersion} (latest)`
      : `v${currentVersion} (update available: v${versionInfo.latest}, run: syrin update)`;

  const messages: Array<{ role: 'system'; content: string }> = [
    {
      role: 'system',
      content: Messages.DEV_WELCOME,
    },
    {
      role: 'system',
      content: `Version: ${versionDisplayString} | LLM: ${options.llmProvider} | Tools: ${options.toolCount}`,
    },
  ];

  if (options.transport === TransportTypes.HTTP && options.mcpUrl) {
    messages.push({
      role: 'system',
      content: Messages.DEV_TRANSPORT_HTTP(options.transport, options.mcpUrl),
    });
  } else if (options.transport === TransportTypes.STDIO && options.command) {
    messages.push({
      role: 'system',
      content: Messages.DEV_TRANSPORT_STDIO(options.transport, options.command),
    });
  }

  messages.push({
    role: 'system',
    content: Messages.DEV_HELP_MESSAGE,
  });

  return messages;
}

/**
 * Format tools list for display.
 */
export function formatToolsList(
  tools: Array<{ name: string; description?: string }>
): string {
  let toolsList = `${Messages.DEV_TOOLS_HEADER}\n`;
  if (tools.length === 0) {
    toolsList += `${Messages.DEV_NO_TOOLS}`;
  } else {
    for (const tool of tools) {
      toolsList += `  • ${tool.name}`;
      if (tool.description) {
        toolsList += `: ${tool.description}`;
      }
      toolsList += '\n';
    }
  }
  return toolsList.trim();
}

/**
 * Format command history for display.
 */
export function formatCommandHistory(historyLines: string[]): string {
  if (historyLines.length === 0) {
    return Messages.DEV_NO_HISTORY;
  }
  let historyList = `${Messages.DEV_HISTORY_HEADER}\n`;
  historyLines.forEach((line: string, index: number) => {
    historyList += `  ${index + 1}. ${line}\n`;
  });
  return historyList.trim();
}

/**
 * Format tool call info for display.
 */
export function formatToolCallInfo(name: string, arguments_: unknown): string {
  return `${Messages.DEV_TOOL_CALLING(name)}\nArguments: ${JSON.stringify(arguments_, null, 2)}`;
}

/**
 * Format tool result for display.
 */
export function formatToolResult(
  name: string,
  result: unknown,
  duration?: number
): string {
  const resultText =
    typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const completed = Messages.DEV_TOOL_COMPLETED(name, duration);
  return `${completed}\nResult: ${resultText}`;
}
