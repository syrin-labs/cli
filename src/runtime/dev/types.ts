/**
 * Dev Mode type definitions.
 */

import type { SyrinConfig } from '@/config/types';
import type { LLMProvider } from '@/runtime/llm/provider';
import type { MCPClientManager } from '@/runtime/mcp/client/manager';
import type { EventEmitter } from '@/events/emitter';
import type { LLMMessage } from '@/runtime/llm/types';

/**
 * Dev Mode session configuration.
 */
export interface DevSessionConfig {
  /** Syrin configuration */
  config: SyrinConfig;
  /** Syrin CLI version (for event payloads) */
  syrinVersion?: string;
  /** LLM provider */
  llmProvider: LLMProvider;
  /** MCP client manager */
  mcpClientManager: MCPClientManager;
  /** Event emitter */
  eventEmitter: EventEmitter;
  /** Execution mode (true = execute, false = preview) */
  executionMode: boolean;
  /** Project root directory */
  projectRoot: string;
}

/**
 * Tool call information.
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  /** Reference ID for large data stored externally */
  resultReference?: string;
  timestamp: Date;
  duration?: number;
}

/**
 * Dev Mode session state.
 */
export interface DevSessionState {
  /** Conversation history */
  conversationHistory: LLMMessage[];
  /** Tool calls made during session */
  toolCalls: ToolCallInfo[];
  /** Total tool calls count */
  totalToolCalls: number;
  /** Total LLM calls count */
  totalLLMCalls: number;
  /** Session start time */
  startTime: Date;
}
