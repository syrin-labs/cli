/**
 * E000: Tool Not Found
 *
 * Condition: Tool is not found in MCP server
 *
 * Why this is fatal:
 * - Tool contract exists but tool is not registered in server
 * - Indicates configuration mismatch or missing tool implementation
 * - Cannot test or validate a tool that doesn't exist
 */

import { BaseRule } from '../base';
import { ERROR_CODES } from '../error-codes';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for tool not found detection.
 */
export interface ToolNotFoundContext {
  /** Tool name */
  toolName: string;
  /** MCP server script name */
  scriptName: string;
}

class E000ToolNotFoundRule extends BaseRule {
  readonly id = ERROR_CODES.E000;
  readonly severity = 'error' as const;
  readonly ruleName = 'Tool Not Found';
  readonly description =
    'Tool is not found in MCP server. Tool contract exists but tool is not registered in the server script.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires runtime context (checked in orchestrator)
    return [];
  }

  /**
   * Check with runtime context (called from test orchestrator).
   */
  checkWithRuntimeContext(runtimeCtx: ToolNotFoundContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    diagnostics.push(
      this.createDiagnostic(
        `Tool "${runtimeCtx.toolName}" not found in MCP server (running: ${runtimeCtx.scriptName}). Ensure the tool is registered in the server script.`,
        runtimeCtx.toolName,
        undefined,
        `Verify that "${runtimeCtx.toolName}" is registered in your MCP server script (${runtimeCtx.scriptName}). If the tool is in a different server file, update the 'script' configuration in syrin.yaml.`
      )
    );

    return diagnostics;
  }
}

export const E000ToolNotFound = new E000ToolNotFoundRule();
