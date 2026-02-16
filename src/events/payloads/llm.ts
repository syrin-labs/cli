/**
 * Payload interfaces for LLM Context & Prompting Events
 * and LLM Proposal Events (Non-Authoritative)
 */

import type { PromptID } from '@/types/ids';

// C. LLM Context & Prompting Events

export interface LLMContextBuiltPayload {
  prompt_id: PromptID;
  context: LLMContext;
  tool_definitions: ToolDefinition[];
  system_prompt?: string;
}

export interface LLMContext {
  messages: Message[];
  tools?: ToolDefinition[];
  resources?: ResourceReference[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ResourceReference {
  uri: string;
  name: string;
  mime_type?: string;
}

export interface PostToolLLMPromptBuiltPayload {
  prompt_id: PromptID;
  tool_call_result: ToolCallResult;
  context: LLMContext;
}

export interface ToolCallResult {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  duration_ms: number;
}

// D. LLM Proposal Events (Non-Authoritative)

export interface LLMProposedActionPayload {
  action_type: 'tool_call' | 'text_response' | 'none';
  reasoning?: string;
}

export interface LLMProposedToolCallPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  reasoning?: string;
}

export interface LLMFinalResponseGeneratedPayload {
  response_text: string;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'error';
  token_count?: number;
  duration_ms: number;
}
