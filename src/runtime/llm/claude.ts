/**
 * Claude (Anthropic) LLM provider implementation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './provider';
import type { LLMRequest, LLMResponse, ToolCall } from './types';
import { checkEnvVar } from '@/config/env-checker';
import { ConfigurationError } from '@/utils/errors';
import type { APIKey, ModelName } from '@/types/ids';

/**
 * Claude provider implementation.
 */
export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    if (!apiKey) {
      throw new ConfigurationError('Claude API key is required');
    }
    if (!modelName) {
      throw new ConfigurationError('Claude model name is required');
    }

    this.client = new Anthropic({
      apiKey,
    });
    this.modelName = modelName;
  }

  getName(): string {
    return 'Claude';
  }

  getModelName(): string {
    return this.modelName;
  }

  supportsToolCalls(): boolean {
    return true;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Convert tools to Claude format
      // Claude requires input_schema to have a 'type' field set to 'object'
      const tools = request.tools?.map(tool => {
        const inputSchema = { ...tool.inputSchema } as Record<string, unknown>;
        // Ensure the schema has a 'type' field set to 'object'
        const schemaWithType = {
          ...inputSchema,
          type: 'object' as const,
        };
        return {
          name: tool.name,
          description: tool.description,
          input_schema: schemaWithType as {
            type: 'object';
            properties?: Record<string, unknown>;
            required?: string[];
            [key: string]: unknown;
          },
        };
      });

      // Convert messages to Claude format
      const messages = request.messages
        .filter(msg => msg.role !== 'system') // System messages handled separately
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Extract system prompt
      const systemPrompt =
        request.systemPrompt ||
        request.messages.find(msg => msg.role === 'system')?.content ||
        '';

      // Build the request parameters
      const requestParams: Parameters<typeof this.client.messages.create>[0] = {
        model: this.modelName,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages,
      };

      if (systemPrompt) {
        requestParams.system = systemPrompt;
      }

      if (tools && tools.length > 0) {
        // Cast tools to the expected type - the SDK will validate
        requestParams.tools = tools as Parameters<
          typeof this.client.messages.create
        >[0]['tools'];
      }

      const response = await this.client.messages.create(requestParams);

      // Type guard: check if it's a Message (not a Stream)
      if (!('content' in response)) {
        throw new Error('Unexpected stream response from Claude API');
      }

      // Now TypeScript knows it's a Message
      const message = response as {
        content: Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: unknown;
        }>;
        stop_reason: string | null;
        usage?: { input_tokens: number; output_tokens: number };
      };

      // Extract content from response
      const contentBlocks = message.content.filter(
        block => block.type === 'text'
      );
      const content = contentBlocks
        .map(block => (block.type === 'text' ? block.text : ''))
        .join('\n');

      // Extract tool use blocks
      const toolCalls: ToolCall[] = [];
      const toolUseBlocks = message.content.filter(
        block => block.type === 'tool_use'
      );
      for (const block of toolUseBlocks) {
        if (block.type === 'tool_use' && block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: (block.input as Record<string, unknown>) || {},
          });
        }
      }

      const finishReason =
        message.stop_reason === 'tool_use'
          ? 'tool_calls'
          : message.stop_reason === 'end_turn'
            ? 'stop'
            : message.stop_reason === 'max_tokens'
              ? 'length'
              : 'stop';

      return {
        content,
        finishReason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: message.usage
          ? {
              promptTokens: message.usage.input_tokens,
              completionTokens: message.usage.output_tokens,
              totalTokens:
                message.usage.input_tokens + message.usage.output_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API error: ${error.message}`);
      }
      throw new Error('Unknown error from Claude API');
    }
  }

  /**
   * Create Claude provider from config.
   * @param apiKeyEnvVar - Environment variable name for API key
   * @param modelNameEnvVar - Environment variable name for model name
   * @param projectRoot - Project root directory
   * @returns Claude provider instance
   */
  static fromConfig(
    apiKeyEnvVar: APIKey | string,
    modelNameEnvVar: ModelName | string,
    projectRoot: string = process.cwd()
  ): ClaudeProvider {
    // Check API key
    const apiKeyCheck = checkEnvVar(apiKeyEnvVar, projectRoot);
    if (!apiKeyCheck.isSet || !apiKeyCheck.value) {
      throw new ConfigurationError(
        apiKeyCheck.errorMessage ||
          `Claude API key (${apiKeyEnvVar}) is not set`
      );
    }

    // Check model name
    const modelNameCheck = checkEnvVar(modelNameEnvVar, projectRoot);
    if (!modelNameCheck.isSet || !modelNameCheck.value) {
      throw new ConfigurationError(
        modelNameCheck.errorMessage ||
          `Claude model name (${modelNameEnvVar}) is not set`
      );
    }

    return new ClaudeProvider(apiKeyCheck.value, modelNameCheck.value);
  }
}
