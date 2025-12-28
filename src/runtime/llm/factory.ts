/**
 * LLM provider factory.
 * Creates LLM provider instances from configuration.
 */

import type { SyrinConfig } from '@/config/types';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { OllamaProvider } from './ollama';
import type { LLMProvider } from './provider';
import { ConfigurationError } from '@/utils/errors';

/**
 * Create an LLM provider from configuration.
 * @param providerName - Name of the provider (e.g., "openai", "claude", "ollama")
 * @param config - Syrin configuration
 * @param projectRoot - Project root directory
 * @returns LLM provider instance
 */
export function createLLMProvider(
  providerName: string,
  config: SyrinConfig,
  projectRoot: string = process.cwd()
): LLMProvider {
  const providerConfig = config.llm[providerName];
  if (!providerConfig) {
    throw new ConfigurationError(
      `LLM provider "${providerName}" not found in configuration`
    );
  }

  // Handle OpenAI
  if (providerName === 'openai') {
    if (!providerConfig.API_KEY || !providerConfig.MODEL_NAME) {
      throw new ConfigurationError(
        'OpenAI provider requires API_KEY and MODEL_NAME'
      );
    }
    return OpenAIProvider.fromConfig(
      providerConfig.API_KEY,
      providerConfig.MODEL_NAME,
      projectRoot
    );
  }

  // Handle Claude
  if (providerName === 'claude') {
    if (!providerConfig.API_KEY || !providerConfig.MODEL_NAME) {
      throw new ConfigurationError(
        'Claude provider requires API_KEY and MODEL_NAME'
      );
    }
    return ClaudeProvider.fromConfig(
      providerConfig.API_KEY,
      providerConfig.MODEL_NAME,
      projectRoot
    );
  }

  // Handle Ollama
  if (providerName === 'ollama') {
    // Ollama provider - MODEL_NAME is required
    if (!providerConfig.MODEL_NAME) {
      throw new ConfigurationError(
        'Ollama provider requires MODEL_NAME to be set in config.yaml'
      );
    }
    return OllamaProvider.fromConfig(providerConfig.MODEL_NAME, projectRoot);
  }

  throw new ConfigurationError(`Unsupported LLM provider: ${providerName}`);
}

/**
 * Get the default LLM provider from configuration.
 * @param config - Syrin configuration
 * @param projectRoot - Project root directory
 * @returns Default LLM provider instance
 */
export function getDefaultLLMProvider(
  config: SyrinConfig,
  projectRoot: string = process.cwd()
): LLMProvider {
  // Find the provider marked as default
  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    if (providerConfig.default) {
      return createLLMProvider(providerName, config, projectRoot);
    }
  }

  // If no default, use the first provider
  const firstProviderName = Object.keys(config.llm)[0];
  if (!firstProviderName) {
    throw new ConfigurationError('No LLM providers configured');
  }

  return createLLMProvider(firstProviderName, config, projectRoot);
}

/**
 * Get LLM provider by name or use default.
 * @param providerName - Optional provider name (e.g., "openai", "claude")
 * @param config - Syrin configuration
 * @param projectRoot - Project root directory
 * @returns LLM provider instance
 */
export function getLLMProvider(
  providerName: string | undefined,
  config: SyrinConfig,
  projectRoot: string = process.cwd()
): LLMProvider {
  if (providerName) {
    return createLLMProvider(providerName, config, projectRoot);
  }
  return getDefaultLLMProvider(config, projectRoot);
}
