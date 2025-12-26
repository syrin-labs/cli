/**
 * Ollama (local) LLM provider implementation.
 */

import type { LLMProvider } from './provider';
import type { LLMRequest, LLMResponse, ToolCall } from './types';
import { ConfigurationError } from '@/utils/errors';

/**
 * Ollama provider implementation.
 * Uses HTTP API to communicate with local Ollama instance.
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private modelName: string;

  constructor(modelName: string, baseUrl: string = 'http://localhost:11434') {
    if (!modelName) {
      throw new ConfigurationError('Ollama model name is required');
    }

    this.modelName = modelName;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  getName(): string {
    return 'Ollama';
  }

  getModelName(): string {
    return this.modelName;
  }

  supportsToolCalls(): boolean {
    // Ollama supports function calling in newer versions
    // For now, we'll return false and handle it in the future
    return false;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Build messages for Ollama
      const messages = request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      // Call Ollama API
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as {
        message?: {
          role: string;
          content: string;
        };
        done: boolean;
        error?: string;
      };

      if (data.error) {
        throw new Error(`Ollama error: ${data.error}`);
      }

      const content = data.message?.content || '';
      const finishReason: 'stop' | 'length' | 'tool_calls' | 'error' = data.done
        ? 'stop'
        : 'length';

      // Ollama doesn't support tool calls in the same way
      // This would need to be handled via prompt engineering or future API support
      return {
        content,
        finishReason,
        toolCalls: undefined,
        usage: undefined, // Ollama doesn't provide token usage
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw new Error('Unknown error from Ollama API');
    }
  }

  /**
   * Check if Ollama is running.
   * @param baseUrl - Base URL for Ollama API
   * @returns true if Ollama is accessible
   */
  static async checkConnection(
    baseUrl: string = 'http://localhost:11434'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
