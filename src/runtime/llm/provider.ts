/**
 * Base LLM provider interface.
 * All LLM providers must implement this interface.
 */

import type { LLMRequest, LLMResponse } from './types';

/**
 * Base interface for all LLM providers.
 */
export interface LLMProvider {
  /**
   * Send a chat request to the LLM.
   * @param request - The LLM request with messages and tools
   * @returns Promise resolving to LLM response
   */
  chat(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Check if this provider supports tool/function calling.
   * @returns true if tool calling is supported
   */
  supportsToolCalls(): boolean;

  /**
   * Get the name of this provider.
   * @returns Provider name (e.g., "OpenAI", "Claude", "Ollama")
   */
  getName(): string;

  /**
   * Get the model name being used.
   * @returns Model name
   */
  getModelName(): string;
}
