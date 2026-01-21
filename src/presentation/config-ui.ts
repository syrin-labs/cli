/**
 * Presentation layer for config command UI.
 * Separates display logic from business logic.
 */

import { log } from '@/utils/logger';
import { Icons } from '@/constants';
import type { SyrinConfig, GlobalSyrinConfig } from '@/config/types';
import { getGlobalConfigPath } from '@/config/global-loader';

/**
 * Mask an API key to show only first 4 and last 4 characters.
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) {
    return '****';
  }
  // If it looks like an env var reference (e.g., OPENAI_API_KEY), don't mask
  if (/^[A-Z][A-Z0-9_]*$/.test(apiKey)) {
    return apiKey;
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

/**
 * Display configuration list/show output.
 */
export function displayConfigList(
  config: SyrinConfig | GlobalSyrinConfig,
  context: 'local' | 'global',
  configPath: string
): void {
  log.blank();
  log.heading(`${context === 'local' ? 'Local' : 'Global'} Configuration`);
  log.blank();
  log.labelValue(`${Icons.FOLDER} Path`, configPath);
  log.blank();

  if (context === 'local' && 'transport' in config) {
    log.heading('Project Settings');
    log.labelValue('  project_name', String(config.project_name));
    log.labelValue('  agent_name', String(config.agent_name));
    log.labelValue('  transport', config.transport);
    if (config.mcp_url) {
      log.labelValue('  mcp_url', String(config.mcp_url));
    }
    if (config.script) {
      log.labelValue('  script', String(config.script));
    }
    log.blank();
  }

  log.heading('LLM Providers');
  const providers = Object.entries(config.llm);
  if (providers.length === 0) {
    log.plain('  No providers configured');
  } else {
    for (const [provider, settings] of providers) {
      const isDefault = settings.default || false;
      const defaultMarker = isDefault ? ' (default)' : '';
      log.label(`  ${provider}${defaultMarker}`);
      if (settings.API_KEY) {
        log.labelValue('    API_KEY', maskApiKey(String(settings.API_KEY)));
      }
      if (settings.MODEL_NAME) {
        log.labelValue('    MODEL_NAME', String(settings.MODEL_NAME));
      }
    }
  }
  log.blank();
}

/**
 * Display success message for config update.
 */
export function displayConfigUpdated(
  key: string,
  value: string,
  context: 'local' | 'global',
  configPath: string
): void {
  log.blank();
  log.success(`${Icons.CHECK} Configuration updated successfully`);
  log.blank();
  log.labelValue('  Key', key);
  log.labelValue('  Value', value);
  log.labelValue('  Config', `${context} (${configPath})`);
  log.blank();
}

/**
 * Display message for opening editor.
 */
export function displayEditorOpening(
  context: 'local' | 'global',
  filePath: string,
  editorName: string
): void {
  log.blank();
  log.info(`Opening ${context} config in editor...`);
  log.labelValue(`  ${Icons.FOLDER} File`, filePath);
  log.labelValue(`  ${Icons.DOCUMENT} Editor`, editorName);
  log.blank();
}

/**
 * Display message after editor closes.
 */
export function displayEditorClosed(fileType: 'config' | 'env'): void {
  log.blank();
  if (fileType === 'config') {
    log.success(`Config file updated`);
    log.blank();
    log.info(`Run \`syrin doctor\` to validate your changes`);
  } else {
    log.success(`${Icons.CHECK} Environment file updated`);
  }
  log.blank();
}

/**
 * Display setup completion message.
 */
export function displaySetupComplete(isGlobal: boolean): void {
  log.blank();
  if (isGlobal) {
    log.success(`${Icons.CHECK} Global configuration created`);
    log.blank();
    log.labelValue(`  ${Icons.FOLDER} Config`, getGlobalConfigPath());
    log.blank();
    log.info(`${Icons.DOCUMENT} Next steps:`);
    log.plain(
      '  1. Set your API keys in ~/.syrin/.env or as environment variables'
    );
    log.plain(
      '  2. Run `syrin config edit-env --global` to edit the environment file'
    );
    log.plain('  3. Run `syrin doctor` to validate your setup');
  }
  log.blank();
}

/**
 * Display default provider set message.
 */
export function displayDefaultProviderSet(
  provider: string,
  context: 'local' | 'global'
): void {
  log.blank();
  log.success(`${Icons.CHECK} Default provider updated`);
  log.blank();
  log.labelValue('  Provider', provider);
  log.labelValue('  Config', context);
  log.blank();
}

/**
 * Display provider removed message.
 */
export function displayProviderRemoved(
  provider: string,
  context: 'local' | 'global'
): void {
  log.blank();
  log.success(`${Icons.CHECK} Provider removed`);
  log.blank();
  log.labelValue('  Provider', provider);
  log.labelValue('  Config', context);
  log.blank();
}
