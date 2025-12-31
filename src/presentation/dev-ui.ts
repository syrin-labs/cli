/**
 * Presentation utilities for dev command.
 * Separates UI/logic concerns by providing functions for displaying messages.
 */

import { Messages, TransportTypes } from '@/constants';
import { checkVersion, getCurrentVersion } from '@/utils/version-checker';
import {
  formatJSONWithPagination,
  getJSONSummary,
} from '@/utils/json-formatter';

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
  // Get version info for display - use package version, not config version
  const currentVersion = getCurrentVersion();
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
 * Handles large JSON efficiently with size-based formatting.
 */
export function formatToolResult(
  name: string,
  result: unknown,
  duration?: number
): string {
  // Convert to JSON string to check size
  const resultText =
    typeof result === 'string' ? result : JSON.stringify(result, null, 2);

  // Calculate size in bytes using Buffer (Node.js compatible)
  const sizeBytes = Buffer.byteLength(resultText, 'utf8');
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;

  const completed = Messages.DEV_TOOL_COMPLETED(name, duration);

  // Get JSON summary for structure info
  let summary;
  let parsedData: unknown = result;
  try {
    parsedData = typeof result === 'string' ? JSON.parse(result) : result;
    summary = getJSONSummary(parsedData);
  } catch {
    // If parsing fails, fall back to string display
    summary = {
      type: 'string',
      size: sizeBytes,
      depth: 0,
      hasLargeArrays: false,
    };
  }

  const sizeDisplay =
    sizeMB >= 1 ? `${sizeMB.toFixed(2)}MB` : `${sizeKB.toFixed(2)}KB`;

  // Size-based formatting strategy
  if (sizeBytes < 100 * 1024) {
    // Small JSON (< 100KB): Show full with tree formatting
    try {
      const treeFormatted = formatJSONWithPagination(parsedData, {
        maxDepth: 5,
        maxArrayItems: 100,
        itemsPerPage: 50,
      });
      return `${completed}\nResult (${sizeDisplay}):\n${treeFormatted}`;
    } catch {
      // Fallback to plain JSON if tree formatting fails
      return `${completed}\nResult (${sizeDisplay}):\n${resultText}`;
    }
  } else if (sizeBytes < 1024 * 1024) {
    // Medium JSON (100KB - 1MB): Show tree with pagination
    try {
      const treeFormatted = formatJSONWithPagination(parsedData, {
        maxDepth: 3,
        maxArrayItems: 50,
        itemsPerPage: 20,
        currentPage: 0,
      });

      let structureInfo = '';
      if (summary.itemCount !== undefined) {
        structureInfo = ` | ${summary.itemCount} items`;
      } else if (summary.keyCount !== undefined) {
        structureInfo = ` | ${summary.keyCount} keys`;
      }

      return `${completed}\nResult (${sizeDisplay}${structureInfo}):\n${treeFormatted}\n\n💡 Tip: Large arrays are paginated. Use /expand <array-path> to view more items.`;
    } catch {
      // Fallback to summary if tree formatting fails
      const lines = resultText.split('\n');
      const previewLines = 30;
      const preview = lines.slice(0, previewLines).join('\n');
      const remaining = lines.length - previewLines;

      let structureInfo = '';
      if (summary.itemCount !== undefined) {
        structureInfo = ` | ${summary.itemCount} items`;
      } else if (summary.keyCount !== undefined) {
        structureInfo = ` | ${summary.keyCount} keys`;
      }

      return `${completed}\nResult (${sizeDisplay}${structureInfo}):\n\nPreview (first ${previewLines} lines, ${remaining} more):\n${preview}\n\n[... ${remaining} more lines ...]`;
    }
  } else {
    // Large JSON (> 1MB): Show summary with tree structure overview
    try {
      // Show only top-level structure
      const treeFormatted = formatJSONWithPagination(parsedData, {
        maxDepth: 2,
        maxArrayItems: 10,
        itemsPerPage: 10,
        currentPage: 0,
      });

      let structureInfo = '';
      if (summary.itemCount !== undefined) {
        structureInfo = ` | ${summary.itemCount} items`;
        if (summary.hasLargeArrays) {
          structureInfo += ' (contains large arrays)';
        }
      } else if (summary.keyCount !== undefined) {
        structureInfo = ` | ${summary.keyCount} keys`;
      }

      return `${completed}\nResult (${sizeDisplay}${structureInfo}):\n\nStructure Overview:\n${treeFormatted}\n\n⚠️  Large result - showing structure only. Full JSON data is available in conversation history for LLM processing.\n💡 Use /expand <path> to view specific sections.`;
    } catch {
      // Fallback to simple summary
      let structureInfo = '';
      if (summary.itemCount !== undefined) {
        structureInfo = `Array with ${summary.itemCount} items`;
        if (summary.hasLargeArrays) {
          structureInfo += ' (contains large arrays)';
        }
      } else if (summary.keyCount !== undefined) {
        structureInfo = `Object with ${summary.keyCount} keys`;
      }

      return `${completed}\nResult (${sizeDisplay}${structureInfo ? ` | ${structureInfo}` : ''}):\n\n⚠️  Very large result truncated for display. Full JSON data is available in the conversation history for LLM processing.`;
    }
  }
}
