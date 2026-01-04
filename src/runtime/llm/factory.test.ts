/**
 * Tests for LLM provider factory.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLLMProvider,
  getDefaultLLMProvider,
  getLLMProvider,
} from './factory';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { OllamaProvider } from './ollama';
import { ConfigurationError } from '@/utils/errors';
import type { SyrinConfig } from '@/config/types';

// Mock providers
vi.mock('./openai', () => ({
  OpenAIProvider: {
    fromConfig: vi.fn(),
  },
}));

vi.mock('./claude', () => ({
  ClaudeProvider: {
    fromConfig: vi.fn(),
  },
}));

vi.mock('./ollama', () => ({
  OllamaProvider: {
    fromConfig: vi.fn(),
  },
}));

describe('LLM provider factory', () => {
  let mockConfig: SyrinConfig;
  let mockOpenAIProvider: OpenAIProvider;
  let mockClaudeProvider: ClaudeProvider;
  let mockOllamaProvider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOpenAIProvider = {
      getName: vi.fn().mockReturnValue('OpenAI'),
      getModelName: vi.fn().mockReturnValue('gpt-4'),
      supportsToolCalls: vi.fn().mockReturnValue(true),
      chat: vi.fn(),
    } as unknown as OpenAIProvider;

    mockClaudeProvider = {
      getName: vi.fn().mockReturnValue('Claude'),
      getModelName: vi.fn().mockReturnValue('claude-3-opus'),
      supportsToolCalls: vi.fn().mockReturnValue(true),
      chat: vi.fn(),
    } as unknown as ClaudeProvider;

    mockOllamaProvider = {
      getName: vi.fn().mockReturnValue('Ollama'),
      getModelName: vi.fn().mockReturnValue('llama3'),
      supportsToolCalls: vi.fn().mockReturnValue(true),
      chat: vi.fn(),
    } as unknown as OllamaProvider;

    mockConfig = {
      project_name: 'test-project',
      version: '1.0.0',
      agent_name: 'Test Agent',
      llm: {
        openai: {
          API_KEY: 'OPENAI_API_KEY',
          MODEL_NAME: 'OPENAI_MODEL',
        },
        claude: {
          API_KEY: 'CLAUDE_API_KEY',
          MODEL_NAME: 'CLAUDE_MODEL',
        },
        ollama: {
          MODEL_NAME: 'OLLAMA_MODEL',
        },
      },
    } as SyrinConfig;
  });

  describe('createLLMProvider', () => {
    it('should create OpenAI provider', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      const provider = createLLMProvider('openai', mockConfig, '/tmp');

      expect(OpenAIProvider.fromConfig).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        '/tmp'
      );
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should create Claude provider', () => {
      vi.mocked(ClaudeProvider.fromConfig).mockReturnValue(mockClaudeProvider);

      const provider = createLLMProvider('claude', mockConfig, '/tmp');

      expect(ClaudeProvider.fromConfig).toHaveBeenCalledWith(
        'CLAUDE_API_KEY',
        'CLAUDE_MODEL',
        '/tmp'
      );
      expect(provider).toBe(mockClaudeProvider);
    });

    it('should create Ollama provider', () => {
      vi.mocked(OllamaProvider.fromConfig).mockReturnValue(mockOllamaProvider);

      const provider = createLLMProvider('ollama', mockConfig, '/tmp');

      expect(OllamaProvider.fromConfig).toHaveBeenCalledWith(
        'OLLAMA_MODEL',
        '/tmp'
      );
      expect(provider).toBe(mockOllamaProvider);
    });

    it('should throw ConfigurationError if provider not found', () => {
      expect(() =>
        createLLMProvider('unknown', mockConfig, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('unknown', mockConfig, '/tmp')
      ).toThrow('LLM provider "unknown" not found in configuration');
    });

    it('should throw ConfigurationError if OpenAI missing API_KEY', () => {
      const configWithoutKey = {
        ...mockConfig,
        llm: {
          openai: {
            MODEL_NAME: 'OPENAI_MODEL',
          },
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('openai', configWithoutKey, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('openai', configWithoutKey, '/tmp')
      ).toThrow('OpenAI provider requires API_KEY and MODEL_NAME');
    });

    it('should throw ConfigurationError if OpenAI missing MODEL_NAME', () => {
      const configWithoutModel = {
        ...mockConfig,
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY',
          },
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('openai', configWithoutModel, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('openai', configWithoutModel, '/tmp')
      ).toThrow('OpenAI provider requires API_KEY and MODEL_NAME');
    });

    it('should throw ConfigurationError if Claude missing API_KEY', () => {
      const configWithoutKey = {
        ...mockConfig,
        llm: {
          claude: {
            MODEL_NAME: 'CLAUDE_MODEL',
          },
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('claude', configWithoutKey, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('claude', configWithoutKey, '/tmp')
      ).toThrow('Claude provider requires API_KEY and MODEL_NAME');
    });

    it('should throw ConfigurationError if Claude missing MODEL_NAME', () => {
      const configWithoutModel = {
        ...mockConfig,
        llm: {
          claude: {
            API_KEY: 'CLAUDE_API_KEY',
          },
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('claude', configWithoutModel, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('claude', configWithoutModel, '/tmp')
      ).toThrow('Claude provider requires API_KEY and MODEL_NAME');
    });

    it('should throw ConfigurationError if Ollama missing MODEL_NAME', () => {
      const configWithoutModel = {
        ...mockConfig,
        llm: {
          ollama: {},
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('ollama', configWithoutModel, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('ollama', configWithoutModel, '/tmp')
      ).toThrow('Ollama provider requires MODEL_NAME');
    });

    it('should throw ConfigurationError for unsupported provider', () => {
      const configWithUnknown = {
        ...mockConfig,
        llm: {
          unknown: {
            API_KEY: 'KEY',
          },
        },
      } as SyrinConfig;

      expect(() =>
        createLLMProvider('unknown', configWithUnknown, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        createLLMProvider('unknown', configWithUnknown, '/tmp')
      ).toThrow('Unsupported LLM provider: unknown');
    });

    it('should use process.cwd() as default projectRoot', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      createLLMProvider('openai', mockConfig);

      expect(OpenAIProvider.fromConfig).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        process.cwd()
      );
    });
  });

  describe('getDefaultLLMProvider', () => {
    it('should return provider marked as default', () => {
      const configWithDefault = {
        ...mockConfig,
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY',
            MODEL_NAME: 'OPENAI_MODEL',
            default: true,
          },
          claude: {
            API_KEY: 'CLAUDE_API_KEY',
            MODEL_NAME: 'CLAUDE_MODEL',
          },
        },
      } as SyrinConfig;

      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      const provider = getDefaultLLMProvider(configWithDefault, '/tmp');

      expect(OpenAIProvider.fromConfig).toHaveBeenCalled();
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should return first provider if no default specified', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      const provider = getDefaultLLMProvider(mockConfig, '/tmp');

      expect(OpenAIProvider.fromConfig).toHaveBeenCalled();
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should throw ConfigurationError if no providers configured', () => {
      const emptyConfig = {
        ...mockConfig,
        llm: {},
      } as SyrinConfig;

      expect(() =>
        getDefaultLLMProvider(emptyConfig, '/tmp')
      ).toThrow(ConfigurationError);
      expect(() =>
        getDefaultLLMProvider(emptyConfig, '/tmp')
      ).toThrow('No LLM providers configured');
    });

    it('should use process.cwd() as default projectRoot', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      getDefaultLLMProvider(mockConfig);

      expect(OpenAIProvider.fromConfig).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        process.cwd()
      );
    });
  });

  describe('getLLMProvider', () => {
    it('should return provider by name when specified', () => {
      vi.mocked(ClaudeProvider.fromConfig).mockReturnValue(mockClaudeProvider);

      const provider = getLLMProvider('claude', mockConfig, '/tmp');

      expect(ClaudeProvider.fromConfig).toHaveBeenCalled();
      expect(provider).toBe(mockClaudeProvider);
    });

    it('should return default provider when name not specified', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      const provider = getLLMProvider(undefined, mockConfig, '/tmp');

      expect(OpenAIProvider.fromConfig).toHaveBeenCalled();
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should use process.cwd() as default projectRoot', () => {
      vi.mocked(OpenAIProvider.fromConfig).mockReturnValue(mockOpenAIProvider);

      getLLMProvider('openai', mockConfig);

      expect(OpenAIProvider.fromConfig).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        process.cwd()
      );
    });
  });
});
