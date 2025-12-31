/**
 * LLM provider constants.
 */

export const LLMProviders = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  OLLAMA: 'ollama',
} as const;

export type LLMProvider = (typeof LLMProviders)[keyof typeof LLMProviders];

/**
 * LLM provider display names.
 */
export const LLMProviderNames = {
  OPENAI: 'OpenAI',
  CLAUDE: 'Claude',
  OLLAMA: 'Ollama',
} as const;

/**
 * LLM provider full display names (for prompts).
 */
export const LLMProviderDisplayNames = {
  OPENAI: 'OpenAI',
  CLAUDE: 'Claude (Anthropic)',
  OLLAMA: 'Ollama',
} as const;
