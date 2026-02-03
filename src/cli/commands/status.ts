/**
 * `syrin status` command implementation.
 * Shows a quick overview of project health (like `git status`).
 */

import * as path from 'path';
import * as fs from 'fs';
import { loadConfigOptional } from '@/config/loader';
import { loadGlobalConfig, getGlobalConfigPath } from '@/config/global-loader';
import { checkEnvVar } from '@/config/env-checker';
import { handleCommandError } from '@/cli/utils';
import { showVersionBanner } from '@/cli/utils/version-banner';
import { log } from '@/utils/logger';
import { Paths, LLMProviders, Icons } from '@/constants';

interface StatusReport {
  hasLocalConfig: boolean;
  hasGlobalConfig: boolean;
  configPath?: string;
  projectName?: string;
  transport?: string;
  mcpUrl?: string;
  script?: string;
  llmProviders: Array<{
    name: string;
    isDefault: boolean;
    isConfigured: boolean;
  }>;
  hasEnvFile: boolean;
  envFilePath?: string;
}

/**
 * Generate status report.
 */
function generateStatusReport(projectRoot: string): StatusReport {
  const localConfig = loadConfigOptional(projectRoot);
  const globalConfig = loadGlobalConfig();

  const localEnvPath = path.join(projectRoot, Paths.ENV_FILE);
  const hasLocalEnv = fs.existsSync(localEnvPath);

  const report: StatusReport = {
    hasLocalConfig: !!localConfig,
    hasGlobalConfig: !!globalConfig,
    llmProviders: [],
    hasEnvFile: hasLocalEnv,
    envFilePath: hasLocalEnv ? localEnvPath : undefined,
  };

  const config = localConfig || globalConfig;
  if (!config) {
    return report;
  }

  if (localConfig) {
    report.configPath = path.join(projectRoot, Paths.CONFIG_FILE);
    report.projectName = String(localConfig.project_name);
    report.transport = String(localConfig.transport);
    report.mcpUrl = localConfig.url ? String(localConfig.url) : undefined;
    report.script = localConfig.script ? String(localConfig.script) : undefined;
  } else if (globalConfig) {
    report.configPath = getGlobalConfigPath();
  }

  // Check LLM providers
  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    let isConfigured = false;

    if (providerName === LLMProviders.OLLAMA) {
      // Ollama only needs MODEL_NAME
      if (providerConfig.MODEL_NAME) {
        const modelCheck = checkEnvVar(
          String(providerConfig.MODEL_NAME),
          projectRoot
        );
        isConfigured = modelCheck.isSet;
      }
    } else {
      // Cloud providers need API_KEY
      if (providerConfig.API_KEY) {
        const apiKeyCheck = checkEnvVar(
          String(providerConfig.API_KEY),
          projectRoot
        );
        isConfigured = apiKeyCheck.isSet;
      }
    }

    report.llmProviders.push({
      name: providerName,
      isDefault: providerConfig.default === true,
      isConfigured,
    });
  }

  return report;
}

/**
 * Display status report.
 */
function displayStatusReport(report: StatusReport): void {
  log.blank();

  // Configuration Status
  log.heading('Configuration');
  log.plain('─'.repeat(40));

  if (report.hasLocalConfig) {
    log.plain(`  ${Icons.SUCCESS} Local config:  ${report.configPath}`);
  } else {
    log.plain(`  ${Icons.FAILURE} Local config:  Not found`);
  }

  if (report.hasGlobalConfig) {
    const globalPath = getGlobalConfigPath();
    log.plain(`  ${Icons.SUCCESS} Global config: ${globalPath}`);
  } else {
    log.plain(`  ${log.styleText('○', 'dim')} Global config: Not configured`);
  }

  log.blank();

  // Project Info (if local config exists)
  if (report.hasLocalConfig && report.projectName) {
    log.heading('Project');
    log.plain('─'.repeat(40));
    log.plain(`  Name:      ${report.projectName}`);
    log.plain(`  Transport: ${report.transport}`);
    if (report.mcpUrl) {
      log.plain(`  MCP URL:   ${report.mcpUrl}`);
    }
    if (report.script) {
      log.plain(`  Script:    ${report.script}`);
    }
    log.blank();
  }

  // LLM Providers
  if (report.llmProviders.length > 0) {
    log.heading('LLM Providers');
    log.plain('─'.repeat(40));

    for (const provider of report.llmProviders) {
      const icon = provider.isConfigured ? Icons.SUCCESS : Icons.FAILURE;
      const defaultLabel = provider.isDefault
        ? log.styleText(' (default)', 'cyan')
        : '';
      const status = provider.isConfigured
        ? log.styleText('configured', 'green')
        : log.styleText('not configured', 'red');
      log.plain(`  ${icon} ${provider.name}${defaultLabel}: ${status}`);
    }
    log.blank();
  }

  // Environment
  log.heading('Environment');
  log.plain('─'.repeat(40));
  if (report.hasEnvFile) {
    log.plain(`  ${Icons.SUCCESS} .env file: ${report.envFilePath}`);
  } else {
    log.plain(`  ${log.styleText('○', 'dim')} .env file: Not found (optional)`);
  }
  log.blank();

  // Quick Actions
  const hasIssues = !report.hasLocalConfig && !report.hasGlobalConfig;
  const hasUnconfiguredProviders = report.llmProviders.some(
    p => !p.isConfigured
  );

  if (hasIssues || hasUnconfiguredProviders) {
    log.heading('Suggested Actions');
    log.plain('─'.repeat(40));

    if (!report.hasLocalConfig && !report.hasGlobalConfig) {
      log.plain(
        `  ${Icons.TIP} Run ${log.styleText('syrin init', 'cyan')} to initialize a project`
      );
    }
    if (hasUnconfiguredProviders) {
      log.plain(
        `  ${Icons.TIP} Run ${log.styleText('syrin doctor', 'cyan')} for detailed diagnostics`
      );
      log.plain(
        `  ${Icons.TIP} Run ${log.styleText('syrin config edit-env', 'cyan')} to set API keys`
      );
    }
    log.blank();
  }
}

/**
 * Execute the status command.
 * @param projectRoot - Project root directory (defaults to current working directory)
 */
export async function executeStatus(
  projectRoot: string = process.cwd()
): Promise<void> {
  await showVersionBanner();

  try {
    const report = generateStatusReport(projectRoot);
    displayStatusReport(report);
  } catch (error) {
    handleCommandError(error);
  }
}
