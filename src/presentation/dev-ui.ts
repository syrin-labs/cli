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
  const completed = Messages.DEV_TOOL_COMPLETED(name, duration);

  // Fast size estimation without full stringification for very large data
  // Use a lightweight size check first
  let sizeBytes: number;
  let resultText: string;
  let parsedData: unknown = result;

  try {
    // Try lightweight size estimation first
    if (typeof result === 'string') {
      resultText = result;
      sizeBytes = Buffer.byteLength(result, 'utf8');
      try {
        parsedData = JSON.parse(result);
      } catch {
        // Not JSON, treat as string
        parsedData = result;
      }
    } else {
      // For objects, estimate size without full stringification
      // This is much faster for large objects
      // Create a small sample by taking a slice/portion of the data
      let sample: unknown;
      if (Array.isArray(result)) {
        // Sample first 10 items
        sample = result.slice(0, 10);
      } else if (
        typeof result === 'object' &&
        result !== null &&
        !Array.isArray(result)
      ) {
        // Sample first 10 keys
        const keys = Object.keys(result as Record<string, unknown>).slice(
          0,
          10
        );
        sample = Object.fromEntries(
          keys.map(key => [key, (result as Record<string, unknown>)[key]])
        );
      } else {
        sample = result;
      }
      const sampleString = JSON.stringify(sample);
      const estimatedSizePerChar =
        sampleString.length === 0
          ? 1 // Default to 1 byte per char for empty string (UTF-8 average)
          : Buffer.byteLength(sampleString, 'utf8') / sampleString.length;
      const estimatedTotalChars = estimateObjectSize(result);
      sizeBytes = Math.floor(estimatedTotalChars * estimatedSizePerChar);

      // Only stringify if we need to (for small/medium sizes)
      if (sizeBytes < 500 * 1024) {
        resultText = JSON.stringify(result, null, 2);
      } else {
        // For large data, skip stringification - we'll just show summary
        resultText = '';
      }
    }
  } catch {
    // Fallback: treat as string
    resultText = String(result);
    sizeBytes = Buffer.byteLength(resultText, 'utf8');
    parsedData = result;
  }

  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  const sizeDisplay =
    sizeMB >= 1 ? `${sizeMB.toFixed(2)}MB` : `${sizeKB.toFixed(2)}KB`;

  // For very large JSON (> 500KB), skip all expensive operations
  // Just show a simple summary to avoid blocking the UI
  if (sizeBytes > 500 * 1024) {
    // Very large: Skip all formatting, just show summary
    let structureInfo = '';
    try {
      if (Array.isArray(parsedData)) {
        structureInfo = `Array with ${parsedData.length} items`;
      } else if (
        typeof parsedData === 'object' &&
        parsedData !== null &&
        !Array.isArray(parsedData)
      ) {
        const keys = Object.keys(parsedData as Record<string, unknown>);
        structureInfo = `Object with ${keys.length} keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`;
      }
    } catch {
      // Ignore errors in structure detection
    }

    return `${completed}\nResult (${sizeDisplay}${structureInfo ? ` | ${structureInfo}` : ''}):\n\n⚠️  Very large result - formatting skipped to maintain UI responsiveness.\n💡 Use /save-json to export the full data to a file for analysis.\n💡 Full JSON data is available in conversation history for LLM processing.`;
  }

  // For smaller data, we can do formatting (but still optimized)
  // Get JSON summary for structure info (only for data we'll format)
  let summary;
  try {
    summary = getJSONSummary(parsedData);
  } catch {
    // If summary fails, use basic info
    summary = {
      type: Array.isArray(parsedData)
        ? 'array'
        : typeof parsedData === 'object' && parsedData !== null
          ? 'object'
          : typeof parsedData,
      size: sizeBytes,
      depth: 0,
      hasLargeArrays:
        Array.isArray(parsedData) && (parsedData as unknown[]).length > 100,
    };
  }

  // Size-based formatting strategy (only for < 500KB)
  // Show collapsed summary by default for better performance
  if (sizeBytes < 100 * 1024) {
    // Small JSON (< 100KB): Show collapsed summary with option to expand
    try {
      // Get a quick summary without full formatting
      let summaryText = '';
      if (Array.isArray(parsedData)) {
        summaryText = `Array with ${parsedData.length} items`;
        if (parsedData.length > 0) {
          summaryText += ` (showing first 3)`;
          const preview = parsedData.slice(0, 3);
          const previewStr = JSON.stringify(preview, null, 2).substring(0, 500);
          summaryText += `:\n${previewStr}${parsedData.length > 3 ? '\n... (use /save-json to see full data)' : ''}`;
        }
      } else if (
        typeof parsedData === 'object' &&
        parsedData !== null &&
        !Array.isArray(parsedData)
      ) {
        const keys = Object.keys(parsedData as Record<string, unknown>);
        summaryText = `Object with ${keys.length} keys`;
        if (keys.length > 0) {
          summaryText += ` (showing first 5)`;
          const previewKeys = keys.slice(0, 5);
          const preview = Object.fromEntries(
            previewKeys.map(k => [
              k,
              (parsedData as Record<string, unknown>)[k],
            ])
          );
          const previewStr = JSON.stringify(preview, null, 2).substring(0, 500);
          summaryText += `:\n${previewStr}${keys.length > 5 ? '\n... (use /save-json to see full data)' : ''}`;
        }
      } else {
        // Primitive or small value: show directly
        summaryText = JSON.stringify(parsedData, null, 2).substring(0, 1000);
      }

      return `${completed}\nResult (${sizeDisplay}):\n${summaryText}\n\n💡 Use /save-json to export the full data to a file.`;
    } catch {
      // Fallback to plain JSON if formatting fails
      const fallbackText =
        typeof parsedData === 'string'
          ? parsedData.substring(0, 1000)
          : JSON.stringify(parsedData, null, 2).substring(0, 1000);
      return `${completed}\nResult (${sizeDisplay}):\n${fallbackText}${sizeBytes > 1000 ? '\n... (use /save-json to see full data)' : ''}`;
    }
  } else {
    // Medium JSON (100KB - 500KB): Show tree with pagination
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

      return `${completed}\nResult (${sizeDisplay}${structureInfo}):\n${treeFormatted}\n\n💡 Tip: Large arrays are paginated. Use /save-json to export full data.`;
    } catch {
      // Fallback to summary if tree formatting fails
      if (!resultText) {
        resultText = JSON.stringify(parsedData, null, 2).substring(0, 5000);
      }
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
  }
}

/**
 * Estimate object size without full stringification (much faster for large objects).
 */
function estimateObjectSize(obj: unknown): number {
  if (obj === null || obj === undefined) return 4; // "null"
  if (typeof obj === 'string') return obj.length + 2; // quotes
  if (typeof obj === 'number') return 10; // average number length
  if (typeof obj === 'boolean') return 5; // "true"/"false"
  if (Array.isArray(obj)) {
    // Estimate: brackets + commas + items
    let size = 2; // brackets
    for (let i = 0; i < Math.min(obj.length, 100); i++) {
      // Sample first 100 items
      size += estimateObjectSize(obj[i]) + 1; // +1 for comma
    }
    if (obj.length > 100) {
      // Extrapolate for remaining items
      const avgItemSize = size / Math.min(obj.length, 100);
      size += (obj.length - 100) * avgItemSize;
    }
    return size;
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>);
    let size = 2; // braces
    for (const key of keys) {
      size += key.length + 3; // key + quotes + colon
      size += estimateObjectSize((obj as Record<string, unknown>)[key]) + 1; // +1 for comma
    }
    return size;
  }
  return 10; // fallback estimate
}
