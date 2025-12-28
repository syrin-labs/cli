/**
 * LLM provider type definitions.
 * Common types used across all LLM provider implementations.
 */

/**
 * Message role in a conversation.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * A message in the conversation.
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
}

/**
 * Tool definition for LLM function calling.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * A tool call proposed by the LLM.
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * LLM response containing text and optional tool calls.
 */
export interface LLMResponse {
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error';
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Request to send to LLM.
 */
export interface LLMRequest {
  messages: LLMMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
