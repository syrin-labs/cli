/**
 * Tests for OpenAI LLM provider.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import OpenAI from 'openai';
import { OpenAIProvider } from './openai';
import { ConfigurationError } from '@/utils/errors';
import { checkEnvVar } from '@/config/env-checker';
import type { LLMRequest } from './types';

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn(),
  };
});

// Mock env-checker
vi.mock('@/config/env-checker', () => ({
  checkEnvVar: vi.fn(),
}));

describe('OpenAIProvider', () => {
  let mockOpenAIClient: {
    chat: {
      completions: {
        create: ReturnType<typeof vi.fn>;
      };
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    vi.mocked(OpenAI).mockImplementation(() => mockOpenAIClient as unknown as OpenAI);
  });

  describe('constructor', () => {
    it('should create provider with valid API key and model', () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
      expect(provider.getModelName()).toBe('gpt-4');
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should throw ConfigurationError if API key is empty', () => {
      expect(() => new OpenAIProvider('', 'gpt-4')).toThrow(ConfigurationError);
      expect(() => new OpenAIProvider('', 'gpt-4')).toThrow(
        'OpenAI API key is required'
      );
    });

    it('should throw ConfigurationError if model name is empty', () => {
      expect(() => new OpenAIProvider('test-api-key', '')).toThrow(
        ConfigurationError
      );
      expect(() => new OpenAIProvider('test-api-key', '')).toThrow(
        'OpenAI model name is required'
      );
    });
  });

  describe('getName', () => {
    it('should return "OpenAI"', () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');
      expect(provider.getName()).toBe('OpenAI');
    });
  });

  describe('getModelName', () => {
    it('should return the model name', () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');
      expect(provider.getModelName()).toBe('gpt-4');
    });
  });

  describe('supportsToolCalls', () => {
    it('should return true', () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');
      expect(provider.supportsToolCalls()).toBe(true);
    });
  });

  describe('chat', () => {
    it('should send chat request successfully', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello, world!',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const response = await provider.chat(request);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        functions: undefined,
        temperature: 0.7,
        max_tokens: undefined,
      });
      expect(response.content).toBe('Hello, world!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('should handle tools/functions', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'test_tool',
                    arguments: '{"arg1": "value1"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Use tool' }],
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {
                arg1: { type: 'string' },
              },
            },
          },
        ],
      };

      const response = await provider.chat(request);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          functions: [
            {
              name: 'test_tool',
              description: 'Test tool',
              parameters: {
                type: 'object',
                properties: {
                  arg1: { type: 'string' },
                },
              },
            },
          ],
        })
      );
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0]?.name).toBe('test_tool');
      expect(response.toolCalls?.[0]?.arguments).toEqual({ arg1: 'value1' });
      expect(response.finishReason).toBe('tool_calls');
    });

    it('should omit parameters for empty tool schemas', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'OK',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        tools: [
          {
            name: 'empty_tool',
            description: 'Empty tool',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };

      await provider.chat(request);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          functions: [
            {
              name: 'empty_tool',
              description: 'Empty tool',
              // parameters should be omitted
            },
          ],
        })
      );
    });

    it('should handle system prompt', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are a helpful assistant',
      };

      await provider.chat(request);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello' },
          ],
        })
      );
    });

    it('should handle custom temperature and maxTokens', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9,
        maxTokens: 100,
      };

      await provider.chat(request);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
          max_tokens: 100,
        })
      );
    });

    it('should handle function_call format (legacy)', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              function_call: {
                name: 'test_tool',
                arguments: '{"arg1": "value1"}',
              },
            },
            finish_reason: 'function_call',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Use tool' }],
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
          },
        ],
      };

      const response = await provider.chat(request);

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0]?.name).toBe('test_tool');
      expect(response.toolCalls?.[0]?.arguments).toEqual({ arg1: 'value1' });
    });

    it('should handle invalid JSON in function arguments', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'test_tool',
                    arguments: 'invalid json',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Use tool' }],
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
          },
        ],
      };

      const response = await provider.chat(request);

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0]?.arguments).toEqual({});
    });

    it('should handle empty response', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const mockResponse = {
        choices: [],
      };

      vi.mocked(mockOpenAIClient.chat.completions.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'No response from OpenAI'
      );
    });

    it('should handle API errors', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      const error = new Error('API rate limit exceeded');
      vi.mocked(mockOpenAIClient.chat.completions.create).mockRejectedValue(
        error
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'OpenAI API error: API rate limit exceeded'
      );
    });

    it('should handle non-Error exceptions', async () => {
      const provider = new OpenAIProvider('test-api-key', 'gpt-4');

      vi.mocked(mockOpenAIClient.chat.completions.create).mockRejectedValue(
        'String error'
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'Unknown error from OpenAI API'
      );
    });
  });

  describe('fromConfig', () => {
    it('should create provider from config with valid env vars', () => {
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-api-key',
        envFileExists: true,
        keyExistsInEnvFile: true,
      });

      vi.mocked(checkEnvVar)
        .mockReturnValueOnce({
          isSet: true,
          value: 'test-api-key',
          envFileExists: true,
          keyExistsInEnvFile: true,
        })
        .mockReturnValueOnce({
          isSet: true,
          value: 'gpt-4',
          envFileExists: true,
          keyExistsInEnvFile: true,
        });

      const provider = OpenAIProvider.fromConfig(
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        '/tmp'
      );

      expect(checkEnvVar).toHaveBeenCalledWith('OPENAI_API_KEY', '/tmp');
      expect(checkEnvVar).toHaveBeenCalledWith('OPENAI_MODEL', '/tmp');
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should throw ConfigurationError if API key not set', () => {
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: false,
        envFileExists: false,
        errorMessage: 'API key not found',
      });

      expect(() =>
        OpenAIProvider.fromConfig('OPENAI_API_KEY', 'OPENAI_MODEL', '/tmp')
      ).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError if model name not set', () => {
      vi.mocked(checkEnvVar)
        .mockReturnValueOnce({
          isSet: true,
          value: 'test-api-key',
          envFileExists: true,
          keyExistsInEnvFile: true,
        })
        .mockReturnValueOnce({
          isSet: false,
          envFileExists: false,
          errorMessage: 'Model name not found',
        });

      expect(() =>
        OpenAIProvider.fromConfig('OPENAI_API_KEY', 'OPENAI_MODEL', '/tmp')
      ).toThrow(ConfigurationError);
    });

    it('should use process.cwd() as default projectRoot', () => {
      vi.mocked(checkEnvVar)
        .mockReturnValueOnce({
          isSet: true,
          value: 'test-api-key',
          envFileExists: true,
          keyExistsInEnvFile: true,
        })
        .mockReturnValueOnce({
          isSet: true,
          value: 'gpt-4',
          envFileExists: true,
          keyExistsInEnvFile: true,
        });

      OpenAIProvider.fromConfig('OPENAI_API_KEY', 'OPENAI_MODEL');

      expect(checkEnvVar).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        process.cwd()
      );
      expect(checkEnvVar).toHaveBeenCalledWith('OPENAI_MODEL', process.cwd());
    });
  });
});
