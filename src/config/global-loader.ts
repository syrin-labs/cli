/**
 * Global configuration file loader.
 * Loads and saves the global syrin.yaml file at ~/.syrin/syrin.yaml
 */

import * as fs from 'fs';
import { load, dump } from 'js-yaml';
import { validateGlobalConfig } from './schema';
import { ConfigurationError } from '@/utils/errors';
import type { GlobalSyrinConfig, LLMProviderConfig } from './types';
import { Paths, Messages } from '@/constants';
import { getDefaultAgentName } from './types';
import { makeSyrinVersion, makeAgentName } from '@/types/factories';

/**
 * Get the path to the global Syrin directory.
 * @returns Absolute path to ~/.syrin/
 */
export function getGlobalSyrinDir(): string {
  return Paths.GLOBAL_SYRIN_DIR;
}

/**
 * Get the path to the global configuration file.
 * @returns Absolute path to ~/.syrin/syrin.yaml
 */
export function getGlobalConfigPath(): string {
  return Paths.GLOBAL_CONFIG_FILE;
}

/**
 * Get the path to the global environment file.
 * @returns Absolute path to ~/.syrin/.env
 */
export function getGlobalEnvPath(): string {
  return Paths.GLOBAL_ENV_FILE;
}

/**
 * Ensure the global Syrin directory exists.
 * Creates ~/.syrin/ if it doesn't exist.
 */
export function ensureGlobalSyrinDir(): void {
  const dir = getGlobalSyrinDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Check if global configuration file exists.
 * @returns true if global config file exists
 */
export function globalConfigExists(): boolean {
  return fs.existsSync(getGlobalConfigPath());
}

/**
 * Load global configuration from ~/.syrin/syrin.yaml file (raw, no validation).
 * @returns Raw config data, or null if file doesn't exist
 */
function loadGlobalConfigRaw(): Record<string, unknown> | null {
  const configPath = getGlobalConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const configData = load(configContent);

    if (!configData || typeof configData !== 'object') {
      return null;
    }

    return configData as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Load global configuration from ~/.syrin/syrin.yaml file.
 * @param skipValidation - If true, skip validation (for editing operations)
 * @returns Loaded and validated global configuration, or null if file doesn't exist
 * @throws {ConfigurationError} If config file exists but is invalid
 */
export function loadGlobalConfig(
  skipValidation: boolean = false
): GlobalSyrinConfig | null {
  const configPath = getGlobalConfigPath();

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    // Read and parse YAML file
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const configData = load(configContent);

    if (!configData || typeof configData !== 'object') {
      throw new ConfigurationError(Messages.ERROR_CONFIG_EMPTY_OR_INVALID, {
        context: { configPath },
      });
    }

    // Skip validation if requested (for editing operations)
    if (skipValidation) {
      const data = configData as Record<string, unknown>;

      // Sanitize version: coerce to string and use makeSyrinVersion or default
      let version: ReturnType<typeof makeSyrinVersion>;
      if (typeof data.version === 'string' && data.version.length > 0) {
        version = makeSyrinVersion(data.version);
      } else {
        version = makeSyrinVersion('1.0');
      }

      // Sanitize agent_name: coerce to string and use makeAgentName or default
      let agent_name: ReturnType<typeof makeAgentName>;
      if (typeof data.agent_name === 'string' && data.agent_name.length > 0) {
        agent_name = makeAgentName(data.agent_name);
      } else {
        agent_name = makeAgentName(getDefaultAgentName());
      }

      // Sanitize llm: ensure it's an object or fallback to empty object
      let llm: Record<string, LLMProviderConfig>;
      if (
        typeof data.llm === 'object' &&
        data.llm !== null &&
        !Array.isArray(data.llm)
      ) {
        llm = data.llm as Record<string, LLMProviderConfig>;
      } else {
        llm = {};
      }

      // Return sanitized structure (not using 'as GlobalSyrinConfig' to avoid unsafe cast)
      return {
        version,
        project_name: 'GlobalSyrin' as const,
        agent_name,
        llm,
      };
    }

    // Validate and transform to opaque types
    const validatedConfig = validateGlobalConfig(configData);

    return validatedConfig;
  } catch (error) {
    if (error instanceof ConfigurationError && !skipValidation) {
      throw error;
    }

    if (skipValidation) {
      // For editing, return a basic structure even if invalid
      const raw = loadGlobalConfigRaw();
      if (raw) {
        // Sanitize version
        let version: ReturnType<typeof makeSyrinVersion>;
        if (typeof raw.version === 'string' && raw.version.length > 0) {
          version = makeSyrinVersion(raw.version);
        } else {
          version = makeSyrinVersion('1.0');
        }

        // Sanitize agent_name
        let agent_name: ReturnType<typeof makeAgentName>;
        if (typeof raw.agent_name === 'string' && raw.agent_name.length > 0) {
          agent_name = makeAgentName(raw.agent_name);
        } else {
          agent_name = makeAgentName(getDefaultAgentName());
        }

        // Sanitize llm
        let llm: Record<string, LLMProviderConfig>;
        if (
          typeof raw.llm === 'object' &&
          raw.llm !== null &&
          !Array.isArray(raw.llm)
        ) {
          llm = raw.llm as Record<string, LLMProviderConfig>;
        } else {
          llm = {};
        }

        return {
          version,
          project_name: 'GlobalSyrin' as const,
          agent_name,
          llm,
        };
      }
      return {
        version: makeSyrinVersion('1.0'),
        project_name: 'GlobalSyrin',
        agent_name: makeAgentName(getDefaultAgentName()),
        llm: {},
      };
    }

    throw new ConfigurationError(
      `${Messages.ERROR_LOADING_CONFIG}: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { configPath },
      }
    );
  }
}

/**
 * Save global configuration to ~/.syrin/syrin.yaml file.
 * @param config - Global configuration to save
 * @param _skipValidation - Skip validation (for editing operations) - TODO: Implement validation skip logic when needed for future editing operations
 * @throws {ConfigurationError} If saving fails
 */
export function saveGlobalConfig(
  config: GlobalSyrinConfig,
  _skipValidation: boolean = false
): void {
  // TODO: When implementing validation skip, use _skipValidation to bypass
  // validateGlobalConfig() before saving. Currently always validates.
  const configPath = getGlobalConfigPath();

  try {
    // Ensure directory exists
    ensureGlobalSyrinDir();

    // Convert config to plain object for YAML serialization
    const configObject = {
      version: config.version,
      project_name: config.project_name,
      agent_name: config.agent_name,
      llm: Object.fromEntries(
        Object.entries(config.llm).map(([key, provider]) => [
          key,
          {
            API_KEY: provider.API_KEY,
            MODEL_NAME: provider.MODEL_NAME,
            default: provider.default,
          },
        ])
      ),
    };

    // Serialize to YAML
    const yamlContent = dump(configObject, {
      indent: 2,
      lineWidth: 100,
      quotingType: '"',
    });

    // Write to file
    fs.writeFileSync(configPath, yamlContent, 'utf-8');

    // Set secure permissions (read/write owner only)
    fs.chmodSync(configPath, 0o600);
  } catch (error) {
    throw new ConfigurationError(
      `Failed to save global configuration: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { configPath },
      }
    );
  }
}

/**
 * Create a default global configuration.
 * @returns Default global configuration with system username as agent name
 */
export function createDefaultGlobalConfig(): GlobalSyrinConfig {
  return {
    version: makeSyrinVersion('1.0'),
    project_name: 'GlobalSyrin',
    agent_name: makeAgentName(getDefaultAgentName()),
    llm: {},
  };
}
