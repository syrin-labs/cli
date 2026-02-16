/**
 * Utility for handling /save-json command in dev mode.
 */

import * as path from 'path';

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
  result?: unknown;
  resultReference?: string;
  duration?: number;
}

export interface SaveJSONResult {
  success: boolean;
  message: string;
  filePath?: string;
  fileSize?: string;
  error?: string;
}

/**
 * Find a tool call by identifier (index or name).
 * @param toolCalls - Array of tool calls
 * @param identifier - Tool name or index (1-based)
 * @returns The matching tool call or undefined
 */
export function findToolCallByIdentifier(
  toolCalls: ToolCallInfo[],
  identifier: string
): ToolCallInfo | undefined {
  if (!identifier) {
    // No identifier - use last tool call
    return toolCalls[toolCalls.length - 1];
  }

  // Try to find by index first
  const index = parseInt(identifier, 10);
  if (!isNaN(index) && index > 0 && index <= toolCalls.length) {
    // 1-indexed for user convenience
    return toolCalls[index - 1];
  }

  // Try to find by name (case-insensitive, partial match)
  const matchingCalls = toolCalls.filter(tc =>
    tc.name.toLowerCase().includes(identifier.toLowerCase())
  );

  if (matchingCalls.length === 0) {
    return undefined;
  }

  if (matchingCalls.length > 1) {
    // Multiple matches - return undefined to signal need to show list
    return undefined;
  }

  return matchingCalls[0];
}

/**
 * Format list of tool calls for display.
 */
export function formatToolCallList(
  toolCalls: ToolCallInfo[],
  matchingCalls: ToolCallInfo[]
): string {
  return matchingCalls
    .map(tc => {
      const index = toolCalls.indexOf(tc) + 1;
      return `  ${index}. ${tc.name} (${tc.timestamp.toLocaleTimeString()})`;
    })
    .join('\n');
}

/**
 * Check if a tool call has a result available.
 */
export function hasToolResult(toolCall: ToolCallInfo): boolean {
  return !!(toolCall.result || toolCall.resultReference);
}

/**
 * Handle the /save-json command logic.
 * @param input - The command input
 * @param session - Session with tool calls and getToolResult method
 * @param projectRoot - Project root directory
 * @returns Result with success status and message
 */
export async function handleSaveJSONCommand(
  input: string,
  session: {
    getState: () => { toolCalls: ToolCallInfo[] };
    getToolResult: (toolCallInfo: ToolCallInfo) => unknown;
  },
  projectRoot: string
): Promise<SaveJSONResult> {
  const parts = input.split(/\s+/);
  const toolIdentifier = parts[1];

  const sessionState = session.getState();
  const toolCalls = sessionState.toolCalls;

  if (toolCalls.length === 0) {
    return {
      success: false,
      message: 'No tool calls found. Run a tool first to save its result.',
    };
  }

  // Find the tool call to save
  const toolCallToSave = findToolCallByIdentifier(
    toolCalls,
    toolIdentifier ?? ''
  );

  if (!toolCallToSave) {
    if (toolIdentifier) {
      // Check if it's a name that matched multiple
      const matchingCalls = toolCalls.filter(tc =>
        tc.name.toLowerCase().includes(toolIdentifier.toLowerCase())
      );
      if (matchingCalls.length > 1) {
        const toolList = formatToolCallList(toolCalls, matchingCalls);
        return {
          success: false,
          message: `Multiple tools found matching "${toolIdentifier}":\n${toolList}\n\nUse /save-json <index> to save a specific one.`,
        };
      }
      return {
        success: false,
        message: `No tool found matching "${toolIdentifier}". Use /save-json without arguments to save the last result, or use a tool index (1-${toolCalls.length}).`,
      };
    }
    return {
      success: false,
      message: 'No tool result available to save.',
    };
  }

  if (!hasToolResult(toolCallToSave)) {
    return {
      success: false,
      message: 'No tool result available to save.',
    };
  }

  try {
    // Get the result (load from file if externalized)
    const result = session.getToolResult(toolCallToSave);

    const { saveJSONToFile, getFileSize } =
      await import('@/utils/json-file-saver');
    // Save to .syrin/data directory
    const dataDir = path.join(projectRoot, '.syrin', 'data');
    const filePath = saveJSONToFile(result, toolCallToSave.name, dataDir);
    const fileSize = getFileSize(filePath);

    return {
      success: true,
      message: `✅ JSON saved to file:\n   ${filePath}\n   Size: ${fileSize}\n   Tool: ${toolCallToSave.name}\n\n💡 You can open this file with: cat "${filePath}" | jq .`,
      filePath,
      fileSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error saving JSON: ${errorMessage}`,
      error: errorMessage,
    };
  }
}
