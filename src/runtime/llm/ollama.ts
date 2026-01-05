/**
 * Ollama (local) LLM provider implementation.
 * Supports both Ollama SDK (automatic) and local command execution.
 */

import { Ollama } from 'ollama';
import * as childProcess from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import type { LLMProvider } from './provider';
import type { LLMRequest, LLMResponse, ToolCall } from './types';
import { ConfigurationError } from '@/utils/errors';
import { logger, log } from '@/utils/logger';
import { checkCommandExists, checkEnvVar } from '@/config/env-checker';

/**
 * Static process manager for Ollama service.
 * Ensures only one Ollama process is spawned per application instance.
 */
class OllamaProcessManager {
  private static ollamaProcess: childProcess.ChildProcess | null = null;
  private static isStarting = false;

  /**
   * Start Ollama service if not already running.
   */
  static async ensureRunning(
    baseUrl: string = 'http://localhost:11434'
  ): Promise<void> {
    // Check if already running
    const client = new Ollama({ host: baseUrl });
    try {
      await client.list();
      return; // Already running
    } catch {
      // Not running, continue to start it
    }

    // Check if Ollama is installed
    if (!checkCommandExists('ollama')) {
      throw new ConfigurationError(
        `Ollama is not installed on your system.\n` +
          `\n` +
          `To install Ollama:\n` +
          `  1. Visit https://ollama.ai and download for your platform\n` +
          `  2. Install Ollama\n` +
          `  3. Run this command again\n` +
          `\n` +
          `Note: We cannot automatically install Ollama as it requires system-level permissions.`
      );
    }

    // Prevent multiple simultaneous start attempts
    if (this.isStarting) {
      // Wait for the other start attempt to complete
      let retries = 30; // Wait up to 30 seconds
      while (this.isStarting && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await client.list();
          return; // Started by another attempt
        } catch {
          retries--;
        }
      }
      if (retries === 0) {
        throw new ConfigurationError(
          'Timeout waiting for Ollama service to start'
        );
      }
      return;
    }

    this.isStarting = true;

    try {
      log.info('🚀 Starting Ollama service...');

      // Spawn Ollama serve process
      this.ollamaProcess = childProcess.spawn('ollama', ['serve'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false, // Keep attached so we can clean it up
      });

      // Set up cleanup on exit
      const cleanup = (): void => {
        if (this.ollamaProcess) {
          try {
            this.ollamaProcess.kill();
          } catch {
            // Ignore errors during cleanup
          }
          this.ollamaProcess = null;
        }
      };

      process.once('exit', cleanup);
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      // Capture output (but don't spam console)
      this.ollamaProcess.stdout?.on('data', () => {
        // Ollama serve outputs are usually not needed
      });
      this.ollamaProcess.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        // Only log errors, not normal startup messages
        if (message && /error|fatal|critical/i.test(message)) {
          logger.warn(`Ollama: ${message}`);
        }
      });

      // Handle process errors
      this.ollamaProcess.on('error', (error: Error) => {
        logger.error('Failed to start Ollama service', error);
        this.ollamaProcess = null;
        this.isStarting = false;
        throw new ConfigurationError(
          `Failed to start Ollama service: ${error.message}`
        );
      });

      // Wait for Ollama to be ready (poll with retries)
      const maxRetries = 30; // 30 seconds max
      const retryDelay = 1000; // 1 second between retries

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        try {
          await client.list();
          log.success('✅ Ollama service is running');
          log.blank();
          this.isStarting = false;
          return; // Success!
        } catch {
          // Not ready yet, continue waiting
          if (i === maxRetries - 1) {
            // Last retry failed
            if (this.ollamaProcess) {
              this.ollamaProcess.kill();
              this.ollamaProcess = null;
            }
            this.isStarting = false;
            throw new ConfigurationError(
              'Ollama service failed to start within 30 seconds. ' +
                'Please check if Ollama is installed correctly.'
            );
          }
        }
      }
    } catch (error) {
      this.isStarting = false;
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `Failed to start Ollama service: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop the Ollama service if we started it.
   */
  static stop(): void {
    if (this.ollamaProcess) {
      try {
        this.ollamaProcess.kill();
      } catch {
        // Ignore errors
      }
      this.ollamaProcess = null;
    }
    this.isStarting = false;
  }
}

/**
 * Ollama provider implementation.
 * Uses Ollama SDK to communicate with local Ollama instance.
 * Automatically handles service startup and model downloading if needed.
 */
export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private modelName: string;
  private baseUrl: string;

  constructor(modelName: string, baseUrl: string = 'http://localhost:11434') {
    if (!modelName) {
      throw new ConfigurationError('Ollama model name is required');
    }

    this.modelName = modelName;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.client = new Ollama({
      host: this.baseUrl,
    });
  }

  getName(): string {
    return 'Ollama';
  }

  getModelName(): string {
    return this.modelName;
  }

  supportsToolCalls(): boolean {
    // Ollama supports function calling/tools in newer models
    // Most modern models (llama3.1+, mistral, etc.) support tools
    return true;
  }

  /**
   * Ensure Ollama service is running, start it automatically if needed.
   */
  private async ensureOllamaRunning(): Promise<void> {
    try {
      // Try to connect first
      await this.client.list();
      return; // Already running
    } catch {
      // Not running, try to start it automatically
      await OllamaProcessManager.ensureRunning(this.baseUrl);
      // Verify it's now running
      try {
        await this.client.list();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new ConfigurationError(
          `Failed to connect to Ollama at ${this.baseUrl} after starting service: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Check if model exists, download if it doesn't.
   * Uses official Ollama API: https://github.com/ollama/ollama-js
   */
  private async ensureModelExists(): Promise<void> {
    try {
      // Check if model exists using list() API
      const modelsResponse = await this.client.list();
      const modelExists =
        modelsResponse.models?.some(
          (m: { name: string }) =>
            m.name === this.modelName || m.name.startsWith(`${this.modelName}:`)
        ) ?? false;

      if (!modelExists) {
        logger.info(`Model ${this.modelName} not found. Downloading...`);
        log.blank();
        log.info(`📥 Downloading model: ${this.modelName}`);
        log.plain(
          'This may take a few minutes depending on your internet connection...'
        );
        log.blank();

        // Pull the model using official API with streaming for progress
        const stream = await this.client.pull({
          model: this.modelName,
          stream: true,
        });

        // Show download progress according to ollama-js API
        // Stream chunks have: status, completed, total, etc.
        let lastPercent = 0;
        for await (const chunk of stream) {
          // Handle progress updates
          if (
            chunk.completed !== undefined &&
            chunk.total !== undefined &&
            chunk.total > 0
          ) {
            const percent = Math.round((chunk.completed / chunk.total) * 100);
            if (percent !== lastPercent) {
              process.stdout.write(`\r📥 Downloading: ${percent}%`);
              lastPercent = percent;
            }
          }
          // Show status messages
          if (chunk.status) {
            process.stdout.write(`\r📥 ${chunk.status}`);
          }
        }
        log.blank();
        log.success('✅ Model downloaded successfully!');
        log.blank();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new ConfigurationError(
        `Failed to ensure model ${this.modelName} is available: ${errorMessage}`
      );
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Ensure Ollama is running
      await this.ensureOllamaRunning();

      // Ensure model exists (download if needed)
      await this.ensureModelExists();

      // Build messages for Ollama
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

      // Convert tools to Ollama format if provided
      // Ollama uses a 'tools' array with function definitions
      const tools = request.tools?.map(tool => {
        // Ollama expects tools in a specific format
        // Format: { type: 'function', function: { name, description, parameters } }
        const inputSchema = tool.inputSchema as {
          type?: string;
          properties?: Record<
            string,
            {
              type?: string | string[];
              items?: unknown;
              description?: string;
              enum?: unknown[];
            }
          >;
          required?: string[];
        };

        // Convert properties to the format Ollama expects
        const properties: Record<
          string,
          {
            type?: string | string[];
            items?: unknown;
            description?: string;
            enum?: unknown[];
          }
        > = {};
        if (inputSchema.properties) {
          for (const [key, value] of Object.entries(inputSchema.properties)) {
            if (
              value &&
              typeof value === 'object' &&
              ('type' in value || 'description' in value)
            ) {
              properties[key] = value as {
                type?: string | string[];
                items?: unknown;
                description?: string;
                enum?: unknown[];
              };
            } else {
              // Default structure if not properly formatted
              const valueStr =
                typeof value === 'string'
                  ? value
                  : value && typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value);
              properties[key] = {
                type: 'string',
                description: valueStr,
              };
            }
          }
        }

        return {
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'object',
              properties,
              required: inputSchema.required || [],
            },
          },
        };
      });

      // Call Ollama API according to official API: https://github.com/ollama/ollama-js
      const chatRequest: Parameters<typeof this.client.chat>[0] = {
        model: this.modelName,
        messages,
        stream: false, // We want a complete response, not a stream
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens,
        },
      };

      // Add tools if available
      if (tools && tools.length > 0) {
        chatRequest.tools = tools;
      }

      const response = await this.client.chat(chatRequest);

      // Response structure according to ollama-js API:
      // { message: { role: string, content: string, tool_calls?: [...] }, done: boolean, ... }
      const content = response.message?.content || '';

      // Extract tool calls from response
      // Ollama returns tool_calls in the message if the model supports it
      const toolCalls: ToolCall[] = [];
      if (
        response.message &&
        'tool_calls' in response.message &&
        response.message.tool_calls
      ) {
        const toolCallsArray = response.message.tool_calls as Array<{
          id?: string;
          type?: string;
          function?: {
            name: string;
            arguments?: string | Record<string, unknown>;
          };
        }>;

        for (const toolCall of toolCallsArray) {
          if (toolCall.function) {
            try {
              let args: Record<string, unknown>;
              if (typeof toolCall.function.arguments === 'string') {
                args = JSON.parse(toolCall.function.arguments) as Record<
                  string,
                  unknown
                >;
              } else if (
                toolCall.function.arguments &&
                typeof toolCall.function.arguments === 'object' &&
                !Array.isArray(toolCall.function.arguments)
              ) {
                args = toolCall.function.arguments;
              } else {
                args = {};
              }

              toolCalls.push({
                id: toolCall.id || uuidv4(),
                name: toolCall.function.name,
                arguments: args,
              });
            } catch {
              // If parsing fails, use empty object
              toolCalls.push({
                id: toolCall.id || uuidv4(),
                name: toolCall.function.name,
                arguments: {},
              });
            }
          }
        }
      }

      const finishReason: 'stop' | 'length' | 'tool_calls' | 'error' =
        toolCalls.length > 0 ? 'tool_calls' : response.done ? 'stop' : 'length';

      // Extract usage statistics if available
      const evalCount = response.eval_count;
      const promptEvalCount = response.prompt_eval_count;

      return {
        content,
        finishReason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage:
          evalCount !== undefined && promptEvalCount !== undefined
            ? {
                promptTokens: promptEvalCount,
                completionTokens: evalCount,
                totalTokens: promptEvalCount + evalCount,
              }
            : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof ConfigurationError) {
        throw err;
      }
      if (err instanceof Error) {
        // Check if it's a connection error - try to start Ollama automatically
        if (
          err.message.includes('fetch failed') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ENOTFOUND')
        ) {
          try {
            // Try to start Ollama automatically
            await OllamaProcessManager.ensureRunning(this.baseUrl);
            // Retry the request
            return this.chat(request);
          } catch (startError) {
            if (startError instanceof ConfigurationError) {
              throw startError;
            }
            throw new ConfigurationError(
              `Cannot connect to Ollama at ${this.baseUrl}. ` +
                `Failed to start service automatically: ${
                  startError instanceof Error
                    ? startError.message
                    : String(startError)
                }`
            );
          }
        }
        throw new Error(`Ollama API error: ${err.message}`);
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
      const client = new Ollama({ host: baseUrl });
      await client.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create Ollama provider from config.
   * @param modelNameEnvVar - Environment variable name for model name, or direct model name
   * @param projectRoot - Project root directory
   * @param baseUrl - Optional base URL for Ollama (defaults to http://localhost:11434)
   * @returns Ollama provider instance
   */
  static fromConfig(
    modelNameEnvVar: string,
    projectRoot: string = process.cwd(),
    baseUrl?: string
  ): OllamaProvider {
    const modelNameCheck = checkEnvVar(modelNameEnvVar, projectRoot);

    if (!modelNameCheck.isSet || !modelNameCheck.value) {
      throw new ConfigurationError(
        modelNameCheck.errorMessage ||
          `Ollama model name (${modelNameEnvVar}) is not set`
      );
    }

    return new OllamaProvider(modelNameCheck.value, baseUrl);
  }
}
