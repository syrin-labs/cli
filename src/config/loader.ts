/**
 * Configuration file loader.
 * Loads and parses the syrin.yaml file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load, dump } from 'js-yaml';
import { validateConfig } from './schema';
import { ConfigurationError } from '@/utils/errors';
import type { SyrinConfig } from './types';
import { Paths, Messages, ToolCommands } from '@/constants';
import { loadGlobalConfig } from './global-loader';
import {
  mergeConfigs,
  createConfigFromGlobal,
  type CLIConfigFlags,
} from './merger';

/**
 * Load configuration from syrin.yaml file.
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @returns Loaded and validated configuration
 * @throws {ConfigurationError} If config file is missing or invalid
 */
export function loadConfig(projectRoot: string = process.cwd()): SyrinConfig {
  const config = loadConfigOptional(projectRoot);
  if (config === null) {
    const configPath = path.join(projectRoot, Paths.CONFIG_FILE);
    throw new ConfigurationError(
      Messages.ERROR_CONFIG_NOT_FOUND(ToolCommands.INIT),
      {
        context: { projectRoot, configPath },
      }
    );
  }
  return config;
}

/**
 * Check if a configuration file exists.
 * @param projectRoot - Root directory of the project
 * @returns true if config file exists
 */
export function configExists(projectRoot: string = process.cwd()): boolean {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);
  return fs.existsSync(configPath);
}

/**
 * Load configuration from syrin.yaml file (optional).
 * Returns null if file doesn't exist instead of throwing.
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @returns Loaded and validated configuration, or null if file doesn't exist
 * @throws {ConfigurationError} If config file exists but is invalid
 */
export function loadConfigOptional(
  projectRoot: string = process.cwd()
): SyrinConfig | null {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);

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

    // Validate and transform to opaque types
    const validatedConfig = validateConfig(configData);

    return validatedConfig;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
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
 * Load configuration with global fallback.
 * Tries local config first, then global config, then throws error.
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @param flags - CLI flags that can override config values
 * @returns Loaded and merged configuration
 * @throws {Error} If neither local nor global config exists
 */
export function loadConfigWithGlobal(
  projectRoot: string = process.cwd(),
  flags: CLIConfigFlags = {}
): { config: SyrinConfig; source: 'local' | 'global' } {
  const localConfig = loadConfigOptional(projectRoot);
  const globalConfig = loadGlobalConfig();

  if (localConfig) {
    return { config: mergeConfigs(localConfig, globalConfig), source: 'local' };
  }

  if (globalConfig) {
    const adaptedConfig = createConfigFromGlobal(globalConfig, flags);
    return { config: adaptedConfig, source: 'global' };
  }

  throw new ConfigurationError(
    Messages.ERROR_CONFIG_NOT_FOUND(ToolCommands.INIT),
    {
      context: { projectRoot },
    }
  );
}

/**
 * Save local configuration to syrin.yaml file.
 * @param config - Configuration to save
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @throws {ConfigurationError} If saving fails
 */
export function saveLocalConfig(
  config: SyrinConfig,
  projectRoot: string = process.cwd()
): void {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);

  try {
    // Convert config to plain object for YAML serialization
    const configObject = {
      version: config.version,
      project_name: config.project_name,
      agent_name: config.agent_name,
      transport: config.transport,
      ...(config.mcp_url ? { mcp_url: config.mcp_url } : {}),
      ...(config.script ? { script: config.script } : {}),
      llm: Object.fromEntries(
        Object.entries(config.llm).map(([key, provider]) => [
          key,
          {
            ...(provider.API_KEY !== undefined
              ? { API_KEY: provider.API_KEY }
              : {}),
            ...(provider.MODEL_NAME !== undefined
              ? { MODEL_NAME: provider.MODEL_NAME }
              : {}),
            default: provider.default,
          },
        ])
      ),
      ...(config.check ? { check: config.check } : {}),
    };

    // Serialize to YAML
    const yamlContent = dump(configObject, {
      indent: 2,
      lineWidth: 100,
      quotingType: '"',
    });

    // Write to file
    fs.writeFileSync(configPath, yamlContent, 'utf-8');
  } catch (error) {
    throw new ConfigurationError(
      `Failed to save local configuration: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { configPath },
      }
    );
  }
}
