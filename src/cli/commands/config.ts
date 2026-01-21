/**
 * `syrin config` command implementation.
 * Manages both local and global Syrin configurations.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { loadConfigOptional, saveLocalConfig } from '@/config/loader';
import {
  loadGlobalConfig,
  saveGlobalConfig,
  getGlobalConfigPath,
  globalConfigExists,
} from '@/config/global-loader';
import { getGlobalEnvPath } from '@/config/global-loader';
import { Paths } from '@/constants';
import { log } from '@/utils/logger';
import { openInEditor } from '@/utils/editor';
import {
  displayConfigList,
  displayConfigUpdated,
  displayEditorOpening,
  displayEditorClosed,
  displayDefaultProviderSet,
  displayProviderRemoved,
} from '@/presentation/config-ui';
import {
  getGlobalEnvTemplate,
  getLocalEnvTemplate,
} from '@/config/env-templates';
import type { SyrinConfig, GlobalSyrinConfig } from '@/config/types';
import { makeAgentName, makeAPIKey, makeModelName } from '@/types/factories';

export interface ConfigCommandOptions {
  /** Operate on global config */
  global?: boolean;
  /** Operate on local config */
  local?: boolean;
  /** Key to get/set (e.g., "openai.model", "agent_name") */
  key?: string;
  /** Value to set */
  value?: string;
}

/**
 * Detect config context (local or global).
 * @param projectRoot - Project root directory
 * @param options - Command options
 * @returns 'local' | 'global' | null
 */
function detectConfigContext(
  projectRoot: string,
  options: ConfigCommandOptions
): 'local' | 'global' | null {
  // Explicit flags take precedence
  if (options.local) return 'local';
  if (options.global) return 'global';

  // Auto-detect: local if exists, else global
  const localConfigPath = path.join(projectRoot, Paths.CONFIG_FILE);
  const localExists = fs.existsSync(localConfigPath);

  if (localExists) return 'local';
  if (globalConfigExists()) return 'global';

  return null;
}

/**
 * Get config based on context.
 * @param skipValidation - Skip validation (for editing operations)
 */
function getConfig(
  projectRoot: string,
  context: 'local' | 'global',
  skipValidation: boolean = false
): SyrinConfig | GlobalSyrinConfig | null {
  if (context === 'local') {
    return loadConfigOptional(projectRoot);
  }
  return loadGlobalConfig(skipValidation);
}

/**
 * Save config based on context.
 */
function saveConfig(
  config: SyrinConfig | GlobalSyrinConfig,
  context: 'local' | 'global',
  projectRoot: string,
  skipValidation: boolean = true
): void {
  if (context === 'global') {
    if ('transport' in config) {
      throw new Error(
        'Cannot save full config to global. Global config only supports LLM settings.'
      );
    }
    saveGlobalConfig(config as GlobalSyrinConfig, skipValidation);
  } else {
    if (!('transport' in config)) {
      throw new Error(
        'Cannot save global config to local. Local config requires transport and other fields.'
      );
    }
    saveLocalConfig(config as SyrinConfig, projectRoot);
  }
}

/**
 * Parse a config key path (e.g., "openai.model" -> { provider: "openai", field: "model" }).
 */
function parseConfigKey(key: string): {
  provider?: string;
  field: string;
} {
  const parts = key.split('.');
  if (parts.length === 1) {
    const field = parts[0];
    if (!field) {
      throw new Error(`Invalid config key: ${key}. Field cannot be empty.`);
    }
    return { field };
  }
  if (parts.length === 2) {
    const provider = parts[0];
    const field = parts[1];
    if (!provider || !field) {
      throw new Error(
        `Invalid config key: ${key}. Provider and field cannot be empty.`
      );
    }
    return { provider, field };
  }
  throw new Error(
    `Invalid config key: ${key}. Use format "field" or "provider.field"`
  );
}

/**
 * Set a config value.
 */
function setConfigValue(
  config: SyrinConfig | GlobalSyrinConfig,
  key: string,
  value: string,
  context: 'local' | 'global'
): SyrinConfig | GlobalSyrinConfig {
  const parsed = parseConfigKey(key);

  // Validate that global config only allows LLM-related fields
  if (context === 'global') {
    const allowedFields = ['agent_name', 'openai', 'claude', 'ollama'];
    const allowedLLMFields = ['api_key', 'model_name', 'model', 'default'];

    if (parsed.provider) {
      // LLM provider field
      if (!allowedFields.includes(parsed.provider)) {
        throw new Error(
          `Cannot set "${key}" in global config. Global config only supports LLM provider settings.`
        );
      }
      if (!allowedLLMFields.includes(parsed.field)) {
        throw new Error(
          `Invalid LLM field: ${parsed.field}. Allowed: api_key, model_name, model, default`
        );
      }
    } else {
      // Top-level field
      if (parsed.field !== 'agent_name') {
        throw new Error(
          `Cannot set "${key}" in global config. Global config only supports "agent_name" and LLM provider settings.`
        );
      }
    }
  }

  // Clone config
  // Note: JSON.parse(JSON.stringify()) strips branded/opaque types (e.g., makeAPIKey, makeModelName)
  // This is intentional - we reapply the factories when setting new values below
  const updated = JSON.parse(JSON.stringify(config));

  if (parsed.provider) {
    // LLM provider field
    if (!updated.llm[parsed.provider]) {
      updated.llm[parsed.provider] = {};
    }

    const fieldMap: Record<string, string> = {
      api_key: 'API_KEY',
      model_name: 'MODEL_NAME',
      model: 'MODEL_NAME',
    };

    const actualField = fieldMap[parsed.field] || parsed.field.toUpperCase();

    if (parsed.field === 'default') {
      // Set default provider
      Object.keys(updated.llm).forEach(p => {
        updated.llm[p].default = p === parsed.provider;
      });
    } else {
      updated.llm[parsed.provider][actualField] =
        actualField === 'API_KEY' ? makeAPIKey(value) : makeModelName(value);
    }
  } else {
    // Top-level field
    if (parsed.field === 'agent_name') {
      updated.agent_name = makeAgentName(value);
    } else {
      throw new Error(
        `Cannot set top-level field "${parsed.field}" via config command.`
      );
    }
  }

  return updated;
}

/**
 * Get a config value.
 */
function getConfigValue(
  config: SyrinConfig | GlobalSyrinConfig,
  key: string
): string | boolean | undefined {
  const parsed = parseConfigKey(key);

  if (parsed.provider) {
    // LLM provider field
    const provider = config.llm[parsed.provider];
    if (!provider) {
      return undefined;
    }

    const fieldMap: Record<string, string> = {
      api_key: 'API_KEY',
      model_name: 'MODEL_NAME',
      model: 'MODEL_NAME',
    };

    const actualField = fieldMap[parsed.field] || parsed.field.toUpperCase();

    if (parsed.field === 'default') {
      return provider.default || false;
    }

    return provider[actualField as keyof typeof provider] as string | undefined;
  }
  // Top-level field
  const configRecord = config as unknown as Record<string, unknown>;
  return configRecord[parsed.field] as string | boolean | undefined;
}

/**
 * Execute config set command.
 */
export async function executeConfigSet(
  key: string,
  value: string,
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  // For set operations, skip validation to allow partial provider configs
  const config = getConfig(projectRoot, context, true);
  if (!config) {
    if (context === 'global') {
      throw new Error(
        'No global config found. Run `syrin init --global` to create one.'
      );
    } else {
      throw new Error(
        'No local config found. Run `syrin init` to create one, or use `--global` flag for global config.'
      );
    }
  }

  const updated = setConfigValue(config, key, value, context);

  // Save without strict validation (allow partial provider configs during editing)
  // Validation will happen when config is actually used (in dev mode, etc.)
  saveConfig(updated, context, projectRoot);

  const configPath =
    context === 'local'
      ? path.join(projectRoot, Paths.CONFIG_FILE)
      : getGlobalConfigPath();

  displayConfigUpdated(key, value, context, configPath);
}

/**
 * Execute config get command.
 */
export async function executeConfigGet(
  key: string,
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const config = getConfig(projectRoot, context);
  if (!config) {
    if (context === 'global') {
      throw new Error(
        'No global config found. Run `syrin init --global` to create one.'
      );
    } else {
      throw new Error(
        'No local config found. Run `syrin init` to create one, or use `--global` flag for global config.'
      );
    }
  }

  const value = getConfigValue(config, key);
  if (value === undefined) {
    log.error(`Key "${key}" not found in ${context} config.`);
    process.exit(1);
  }

  log.plain(String(value));
}

/**
 * Execute config list command.
 */
export async function executeConfigList(
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const config = getConfig(projectRoot, context);
  if (!config) {
    if (context === 'global') {
      throw new Error(
        'No global config found. Run `syrin init --global` to create one.'
      );
    } else {
      throw new Error(
        'No local config found. Run `syrin init` to create one, or use `--global` flag for global config.'
      );
    }
  }

  const configPath =
    context === 'local'
      ? path.join(projectRoot, Paths.CONFIG_FILE)
      : getGlobalConfigPath();

  displayConfigList(config, context, configPath);
}

/**
 * Execute config show command (same as list for now).
 */
export async function executeConfigShow(
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  await executeConfigList(options, projectRoot);
}

/**
 * Execute config edit command.
 */
export async function executeConfigEdit(
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const configPath =
    context === 'local'
      ? path.join(projectRoot, Paths.CONFIG_FILE)
      : getGlobalConfigPath();

  const editorName = os.platform() === 'win32' ? 'notepad' : 'nano';
  displayEditorOpening(context, configPath, editorName);

  await openInEditor(configPath);

  displayEditorClosed('config');
}

/**
 * Execute config edit-env command.
 */
export async function executeConfigEditEnv(
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const envPath =
    context === 'local'
      ? path.join(projectRoot, Paths.ENV_FILE)
      : getGlobalEnvPath();

  const template =
    context === 'local' ? getLocalEnvTemplate() : getGlobalEnvTemplate();

  const editorName = os.platform() === 'win32' ? 'notepad' : 'nano';
  displayEditorOpening(context, envPath, editorName);

  await openInEditor(envPath, true, template);

  displayEditorClosed('env');
}

/**
 * Execute config set-default command.
 */
export async function executeConfigSetDefault(
  provider: string,
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const config = getConfig(projectRoot, context);
  if (!config) {
    if (context === 'global') {
      throw new Error(
        'No global config found. Run `syrin init --global` to create one.'
      );
    } else {
      throw new Error(
        'No local config found. Run `syrin init` to create one, or use `--global` flag for global config.'
      );
    }
  }

  if (!config.llm[provider]) {
    throw new Error(
      `LLM provider "${provider}" not found in ${context} config.`
    );
  }

  // Clone config to avoid mutating the original
  const updated = JSON.parse(JSON.stringify(config));

  // Set all providers to non-default, then set the specified one to default
  Object.keys(updated.llm).forEach(p => {
    const providerConfig = updated.llm[p];
    if (providerConfig) {
      providerConfig.default = p === provider;
    }
  });

  saveConfig(updated, context, projectRoot);

  displayDefaultProviderSet(provider, context);
}

/**
 * Execute config remove command.
 */
export async function executeConfigRemove(
  provider: string,
  options: ConfigCommandOptions = {},
  projectRoot: string = process.cwd()
): Promise<void> {
  const context = detectConfigContext(projectRoot, options);
  if (!context) {
    throw new Error(
      'No config found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  const config = getConfig(projectRoot, context);
  if (!config) {
    if (context === 'global') {
      throw new Error(
        'No global config found. Run `syrin init --global` to create one.'
      );
    } else {
      throw new Error(
        'No local config found. Run `syrin init` to create one, or use `--global` flag for global config.'
      );
    }
  }

  if (!config.llm[provider]) {
    throw new Error(
      `LLM provider "${provider}" not found in ${context} config.`
    );
  }

  // Check if it's the only provider
  if (Object.keys(config.llm).length === 1) {
    throw new Error(
      'Cannot remove the last LLM provider. At least one provider is required.'
    );
  }

  // Clone config to avoid mutating the original
  const updated = JSON.parse(JSON.stringify(config));

  // Check if it's the default provider
  if (updated.llm[provider]?.default) {
    // Set another provider as default
    const otherProvider = Object.keys(updated.llm).find(p => p !== provider);
    if (otherProvider) {
      const otherProviderConfig = updated.llm[otherProvider];
      if (otherProviderConfig) {
        otherProviderConfig.default = true;
      }
    }
  }

  delete updated.llm[provider];
  saveConfig(updated, context, projectRoot);

  displayProviderRemoved(provider, context);
}
