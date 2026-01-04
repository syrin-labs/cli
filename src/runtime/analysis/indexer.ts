/**
 * Index builder.
 * Builds fast lookup indexes for analysis rules.
 */

import type { ToolSpec, FieldSpec, Indexes } from './types';

/**
 * Extract keywords from tool name and description.
 */
function extractKeywords(tool: ToolSpec): Set<string> {
  const keywords = new Set<string>();
  const text = `${tool.name} ${tool.description}`.toLowerCase();

  // Extract words (alphanumeric sequences)
  const words = text.match(/\b\w{3,}\b/g) || [];

  for (const word of words) {
    keywords.add(word);
  }

  return keywords;
}

/**
 * Build indexes from normalized tools.
 */
export function buildIndexes(tools: ToolSpec[]): Indexes {
  const toolIndex = new Map<string, ToolSpec>();
  const inputIndex = new Map<string, FieldSpec[]>();
  const outputIndex = new Map<string, FieldSpec[]>();
  const keywordIndex = new Map<string, Set<string>>();

  for (const tool of tools) {
    // Build tool index
    toolIndex.set(tool.name.toLowerCase(), tool);

    // Build input index
    for (const input of tool.inputs) {
      const fieldName = input.name.toLowerCase();
      if (!inputIndex.has(fieldName)) {
        inputIndex.set(fieldName, []);
      }
      inputIndex.get(fieldName)!.push(input);
    }

    // Build output index
    for (const output of tool.outputs) {
      const fieldName = output.name.toLowerCase();
      if (!outputIndex.has(fieldName)) {
        outputIndex.set(fieldName, []);
      }
      outputIndex.get(fieldName)!.push(output);
    }

    // Build keyword index
    const keywords = extractKeywords(tool);
    const toolNameLower = tool.name.toLowerCase();
    for (const keyword of keywords) {
      if (!keywordIndex.has(keyword)) {
        keywordIndex.set(keyword, new Set());
      }
      keywordIndex.get(keyword)!.add(toolNameLower);
    }
  }

  return {
    toolIndex,
    inputIndex,
    outputIndex,
    keywordIndex,
  };
}
