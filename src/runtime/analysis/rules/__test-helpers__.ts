/**
 * Shared test helpers for analysis rule tests.
 */

import type { ToolSpec, FieldSpec } from '../types';

/**
 * Build indexes from tools for testing.
 */
export function buildIndexesFromTools(tools: ToolSpec[]): {
  toolIndex: Map<string, ToolSpec>;
  inputIndex: Map<string, FieldSpec[]>;
  outputIndex: Map<string, FieldSpec[]>;
  keywordIndex: Map<string, Set<string>>;
} {
  const toolIndex = new Map<string, ToolSpec>();
  const inputIndex = new Map<string, FieldSpec[]>();
  const outputIndex = new Map<string, FieldSpec[]>();
  const keywordIndex = new Map<string, Set<string>>();

  for (const tool of tools) {
    toolIndex.set(tool.name.toLowerCase(), tool);

    for (const input of tool.inputs || []) {
      const fieldName = input.name.toLowerCase();
      if (!inputIndex.has(fieldName)) {
        inputIndex.set(fieldName, []);
      }
      inputIndex.get(fieldName)!.push(input);
    }

    for (const output of tool.outputs || []) {
      const fieldName = output.name.toLowerCase();
      if (!outputIndex.has(fieldName)) {
        outputIndex.set(fieldName, []);
      }
      outputIndex.get(fieldName)!.push(output);
    }
  }

  return {
    toolIndex,
    inputIndex,
    outputIndex,
    keywordIndex,
  };
}

/**
 * Setup mocks for analysis tests.
 * Note: Mocks should be set up in individual test files using vi.mock()
 */
