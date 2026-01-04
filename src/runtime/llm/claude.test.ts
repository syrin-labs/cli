/**
 * Tests for Claude LLM provider.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeProvider } from './claude';
import { ConfigurationError } from '@/utils/errors';
import { checkEnvVar } from '@/config/env-checker';
import type { LLMRequest } from './types';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(),
  };
});

// Mock env-checker
vi.mock('@/config/env-checker', () => ({
  checkEnvVar: vi.fn(),
}));

describe('ClaudeProvider', () => {
  let mockAnthropicClient: {
    messages: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAnthropicClient = {
      messages: {
        create: vi.fn(),
      },
    };

    vi.mocked(Anthropic).mockImplementation(
      () => mockAnthropicClient as unknown as Anthropic
    );
  });

  describe('constructor', () => {
    it('should create provider with valid API key and model', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
      expect(provider.getModelName()).toBe('claude-3-opus');
      expect(provider.getName()).toBe('Claude');
    });

    it('should throw ConfigurationError if API key is empty', () => {
      expect(() => new ClaudeProvider('', 'claude-3-opus')).toThrow(
        ConfigurationError
      );
      expect(() => new ClaudeProvider('', 'claude-3-opus')).toThrow(
        'Claude API key is required'
      );
    });

    it('should throw ConfigurationError if model name is empty', () => {
      expect(() => new ClaudeProvider('test-api-key', '')).toThrow(
        ConfigurationError
      );
      expect(() => new ClaudeProvider('test-api-key', '')).toThrow(
        'Claude model name is required'
      );
    });
  });

  describe('getName', () => {
    it('should return "Claude"', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');
      expect(provider.getName()).toBe('Claude');
    });
  });

  describe('getModelName', () => {
    it('should return the model name', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');
      expect(provider.getModelName()).toBe('claude-3-opus');
    });
  });

  describe('supportsToolCalls', () => {
    it('should return true', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');
      expect(provider.supportsToolCalls()).toBe(true);
    });
  });

  describe('chat', () => {
    it('should send chat request successfully', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Hello, world!',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.chat(request);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(response.content).toBe('Hello, world!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('should handle tools', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'test_tool',
            input: { arg1: 'value1' },
          },
        ],
        stop_reason: 'tool_use',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
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

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              input_schema: {
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

    it('should ensure input_schema has type object', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [{ type: 'text', text: 'OK' }],
        stop_reason: 'end_turn',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: {
              properties: {
                arg1: { type: 'string' },
              },
            },
          },
        ],
      };

      await provider.chat(request);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              input_schema: {
                type: 'object',
                properties: {
                  arg1: { type: 'string' },
                },
              },
            },
          ],
        })
      );
    });

    it('should handle system prompt', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are a helpful assistant',
      };

      await provider.chat(request);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant',
        })
      );
    });

    it('should extract system prompt from messages', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'Hello' },
        ],
      };

      await provider.chat(request);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'System message',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      );
    });

    it('should handle custom temperature and maxTokens', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9,
        maxTokens: 100,
      };

      await provider.chat(request);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
          max_tokens: 100,
        })
      );
    });

    it('should handle multiple text blocks', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const mockResponse = {
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' },
        ],
        stop_reason: 'end_turn',
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.chat(request);

      expect(response.content).toBe('First part\nSecond part');
    });

    it('should handle finish reason mapping', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const testCases = [
        { stop_reason: 'tool_use', expected: 'tool_calls' },
        { stop_reason: 'end_turn', expected: 'stop' },
        { stop_reason: 'max_tokens', expected: 'length' },
        { stop_reason: null, expected: 'stop' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        const mockResponse = {
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: testCase.stop_reason,
        };

        vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
          mockResponse as any
        );

        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Hello' }],
        };

        const response = await provider.chat(request);
        expect(response.finishReason).toBe(testCase.expected);
      }
    });

    it('should handle stream response error', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      // Mock a stream response (not a Message)
      const mockStreamResponse = {
        [Symbol.asyncIterator]: vi.fn(),
      };

      vi.mocked(mockAnthropicClient.messages.create).mockResolvedValue(
        mockStreamResponse as any
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'Unexpected stream response from Claude API'
      );
    });

    it('should handle API errors', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      const error = new Error('API rate limit exceeded');
      vi.mocked(mockAnthropicClient.messages.create).mockRejectedValue(error);

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'Claude API error: API rate limit exceeded'
      );
    });

    it('should handle non-Error exceptions', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-3-opus');

      vi.mocked(mockAnthropicClient.messages.create).mockRejectedValue(
        'String error'
      );

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.chat(request)).rejects.toThrow(
        'Unknown error from Claude API'
      );
    });
  });

  describe('fromConfig', () => {
    it('should create provider from config with valid env vars', () => {
      vi.mocked(checkEnvVar)
        .mockReturnValueOnce({
          isSet: true,
          value: 'test-api-key',
          envFileExists: true,
          keyExistsInEnvFile: true,
        })
        .mockReturnValueOnce({
          isSet: true,
          value: 'claude-3-opus',
          envFileExists: true,
          keyExistsInEnvFile: true,
        });

      const provider = ClaudeProvider.fromConfig(
        'CLAUDE_API_KEY',
        'CLAUDE_MODEL',
        '/tmp'
      );

      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_API_KEY', '/tmp');
      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_MODEL', '/tmp');
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    it('should throw ConfigurationError if API key not set', () => {
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: false,
        envFileExists: false,
        errorMessage: 'API key not found',
      });

      expect(() =>
        ClaudeProvider.fromConfig('CLAUDE_API_KEY', 'CLAUDE_MODEL', '/tmp')
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
        ClaudeProvider.fromConfig('CLAUDE_API_KEY', 'CLAUDE_MODEL', '/tmp')
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
          value: 'claude-3-opus',
          envFileExists: true,
          keyExistsInEnvFile: true,
        });

      ClaudeProvider.fromConfig('CLAUDE_API_KEY', 'CLAUDE_MODEL');

      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_API_KEY', process.cwd());
      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_MODEL', process.cwd());
    });
  });
});
