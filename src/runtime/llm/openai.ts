/**
 * OpenAI LLM provider implementation.
 */

import OpenAI from 'openai';
import type { LLMProvider } from './provider';
import type { LLMRequest, LLMResponse, ToolCall } from './types';
import { checkEnvVar } from '@/config/env-checker';
import { ConfigurationError } from '@/utils/errors';
import type { APIKey, ModelName } from '@/types/ids';

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    if (!apiKey) {
      throw new ConfigurationError('OpenAI API key is required');
    }
    if (!modelName) {
      throw new ConfigurationError('OpenAI model name is required');
    }

    this.client = new OpenAI({
      apiKey,
    });
    this.modelName = modelName;
  }

  getName(): string {
    return 'OpenAI';
  }

  getModelName(): string {
    return this.modelName;
  }

  supportsToolCalls(): boolean {
    return true;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Convert tools to OpenAI function format
      const functions = request.tools?.map(tool => {
        const schema = tool.inputSchema;
        // Check if schema is empty (no properties or empty properties object)
        let isEmpty = true;
        let schemaObj: Record<string, unknown> | null = null;

        if (schema && typeof schema === 'object' && schema !== null) {
          schemaObj = schema;
          isEmpty =
            schemaObj.type === 'object' &&
            (!schemaObj.properties ||
              (typeof schemaObj.properties === 'object' &&
                schemaObj.properties !== null &&
                Object.keys(schemaObj.properties).length === 0));
        }

        // For OpenAI, omit parameters if schema is empty to avoid validation errors
        const functionDef: {
          name: string;
          description: string;
          parameters?: Record<string, unknown>;
        } = {
          name: tool.name,
          description: tool.description,
        };

        if (!isEmpty && schemaObj) {
          functionDef.parameters = schemaObj;
        }

        return functionDef;
      });

      const messages = request.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        functions,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const content = choice.message.content || '';
      const finishReason = choice.finish_reason as
        | 'stop'
        | 'length'
        | 'tool_calls'
        | 'error';

      // Extract tool calls if present
      const toolCalls: ToolCall[] = [];
      if (choice.message.function_call) {
        const funcCall = choice.message.function_call;
        try {
          toolCalls.push({
            id: funcCall.name || '',
            name: funcCall.name || '',
            arguments: JSON.parse(funcCall.arguments || '{}') as Record<
              string,
              unknown
            >,
          });
        } catch {
          // If parsing fails, use empty object
          toolCalls.push({
            id: funcCall.name || '',
            name: funcCall.name || '',
            arguments: {},
          });
        }
      }

      // Handle multiple function calls (newer API)
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type === 'function') {
            try {
              toolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name || '',
                arguments: JSON.parse(
                  toolCall.function.arguments || '{}'
                ) as Record<string, unknown>,
              });
            } catch {
              // If parsing fails, use empty object
              toolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name || '',
                arguments: {},
              });
            }
          }
        }
      }

      return {
        content,
        finishReason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error('Unknown error from OpenAI API');
    }
  }

  /**
   * Create OpenAI provider from config.
   * @param apiKeyEnvVar - Environment variable name for API key
   * @param modelNameEnvVar - Environment variable name for model name
   * @param projectRoot - Project root directory
   * @returns OpenAI provider instance
   */
  static fromConfig(
    apiKeyEnvVar: APIKey | string,
    modelNameEnvVar: ModelName | string,
    projectRoot: string = process.cwd()
  ): OpenAIProvider {
    // Check API key
    const apiKeyCheck = checkEnvVar(apiKeyEnvVar, projectRoot);
    if (!apiKeyCheck.isSet || !apiKeyCheck.value) {
      throw new ConfigurationError(
        apiKeyCheck.errorMessage ||
          `OpenAI API key (${apiKeyEnvVar}) is not set`
      );
    }

    // Check model name
    const modelNameCheck = checkEnvVar(modelNameEnvVar, projectRoot);
    if (!modelNameCheck.isSet || !modelNameCheck.value) {
      throw new ConfigurationError(
        modelNameCheck.errorMessage ||
          `OpenAI model name (${modelNameEnvVar}) is not set`
      );
    }

    return new OpenAIProvider(apiKeyCheck.value, modelNameCheck.value);
  }
}
