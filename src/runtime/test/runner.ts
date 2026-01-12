/**
 * Test input runner.
 * Executes tools with contract-defined test inputs.
 */

import type { ToolContract } from './contract-types';
import type { SandboxExecutor, ToolExecutionResult } from '@/runtime/sandbox';

/**
 * Test execution result with metadata.
 */
export type TestExecutionResult = ToolExecutionResult & {
  /** Test case name */
  testName: string;
  /** Test input used */
  testInput: Record<string, unknown>;
  /** Test expectation */
  expectation?: import('./contract-types').TestExpectation;
  /** Expected output schema name (optional, for tests expecting different output schema) */
  expectedOutputSchema?: string;
};

/**
 * Run contract-defined test cases.
 * @param executor - Sandbox executor
 * @param contract - Tool contract
 * @param toolTimeoutMs - Optional timeout for tool execution in milliseconds
 * @returns Array of test execution results
 */
export async function runContractTests(
  executor: SandboxExecutor,
  contract: ToolContract,
  toolTimeoutMs?: number
): Promise<TestExecutionResult[]> {
  if (!contract.tests || contract.tests.length === 0) {
    return [];
  }

  const results: TestExecutionResult[] = [];

  for (const test of contract.tests) {
    // Set environment variables if specified
    const originalEnv = { ...process.env };
    if (test.env) {
      for (const [key, value] of Object.entries(test.env)) {
        process.env[key] = value;
      }
    }

    try {
      // Execute tool with test input (run once)
      const executionResults = await executor.executeTool(
        contract.tool,
        [test.input],
        toolTimeoutMs
      );

      // Map to test execution results
      for (const result of executionResults) {
        results.push({
          ...result,
          testName: test.name,
          testInput: test.input,
          expectation: test.expect,
        });
      }
    } finally {
      // Restore environment properly (avoid reassigning process.env which breaks Node's proxy)
      // Remove any keys that were added
      const currentKeys = Object.keys(process.env);
      for (const key of currentKeys) {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      }
      // Restore any keys that were changed
      for (const [key, value] of Object.entries(originalEnv)) {
        process.env[key] = value;
      }
    }
  }

  return results;
}
