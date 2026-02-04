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
import { Paths, LLMProviders } from '@/constants';

interface LLMProviderInfo {
  name: string;
  isDefault: boolean;
  isConfigured: boolean;
}

interface LocalStatus {
  hasConfig: boolean;
  configPath?: string;
  hasEnv: boolean;
  envPath: string;
  project?: {
    name: string;
    transport: string;
    mcpUrl?: string;
    script?: string;
  };
  llmProviders: LLMProviderInfo[];
}

interface GlobalStatus {
  hasConfig: boolean;
  configPath?: string;
  hasEnv: boolean;
  envPath: string;
  llmProviders: LLMProviderInfo[];
}

interface StatusReport {
  local: LocalStatus;
  global: GlobalStatus;
}

function checkProviderConfigured(
  providerName: string,
  providerConfig: { API_KEY?: unknown; MODEL_NAME?: unknown },
  projectRoot: string,
  isGlobalContext: boolean
): boolean {
  if (providerName === LLMProviders.OLLAMA) {
    if (providerConfig.MODEL_NAME) {
      return checkEnvVar(
        String(providerConfig.MODEL_NAME),
        projectRoot,
        isGlobalContext
      ).isSet;
    }
    return false;
  }
  if (providerConfig.API_KEY) {
    return checkEnvVar(
      String(providerConfig.API_KEY),
      projectRoot,
      isGlobalContext
    ).isSet;
  }
  return false;
}

/**
 * Generate status report.
 */
function generateStatusReport(projectRoot: string): StatusReport {
  const localConfig = loadConfigOptional(projectRoot);
  const globalConfig = loadGlobalConfig();

  const localEnvPath = path.join(projectRoot, Paths.ENV_FILE);
  const hasLocalEnv = fs.existsSync(localEnvPath);
  const globalEnvPath = Paths.GLOBAL_ENV_FILE;
  const hasGlobalEnv = fs.existsSync(globalEnvPath);

  const local: LocalStatus = {
    hasConfig: !!localConfig,
    configPath: localConfig
      ? path.join(projectRoot, Paths.CONFIG_FILE)
      : undefined,
    hasEnv: hasLocalEnv,
    envPath: localEnvPath,
    llmProviders: [],
  };

  if (localConfig) {
    local.project = {
      name: String(localConfig.project_name),
      transport: String(localConfig.transport),
      mcpUrl: localConfig.url ? String(localConfig.url) : undefined,
      script: localConfig.script ? String(localConfig.script) : undefined,
    };
    for (const [name, cfg] of Object.entries(localConfig.llm)) {
      local.llmProviders.push({
        name,
        isDefault: cfg.default === true,
        isConfigured: checkProviderConfigured(name, cfg, projectRoot, false),
      });
    }
  }

  const global: GlobalStatus = {
    hasConfig: !!globalConfig,
    configPath: globalConfig ? getGlobalConfigPath() : undefined,
    hasEnv: hasGlobalEnv,
    envPath: globalEnvPath,
    llmProviders: [],
  };

  if (globalConfig) {
    for (const [name, cfg] of Object.entries(globalConfig.llm)) {
      global.llmProviders.push({
        name,
        isDefault: cfg.default === true,
        isConfigured: checkProviderConfigured(name, cfg, projectRoot, true),
      });
    }
  }

  return { local, global };
}

function renderLLMProviders(providers: LLMProviderInfo[]): void {
  for (const provider of providers) {
    const defaultLabel = provider.isDefault ? ' (default)' : '';
    const status = provider.isConfigured ? 'configured' : 'not configured';
    const icon = provider.isConfigured ? log.tick() : log.cross();
    log.plain(`  ${provider.name}${defaultLabel}: ${status} ${icon}`);
  }
}

/**
 * Display status report.
 */
function displayStatusReport(report: StatusReport): void {
  log.blank();

  // Local
  log.heading('Local');
  log.blank();
  if (report.local.hasConfig) {
    log.labelValue('Config:', report.local.configPath!);
  } else {
    log.labelValue('Config:', 'Not found');
  }
  if (report.local.hasEnv) {
    log.labelValue('.env:', report.local.envPath);
  } else {
    log.labelValue('.env:', 'Not found (optional)');
  }
  if (report.local.project) {
    log.labelValue('Project:', report.local.project.name);
    log.labelValue('Transport:', report.local.project.transport);
    if (report.local.project.mcpUrl) {
      log.labelValue('MCP URL:', report.local.project.mcpUrl);
    }
    if (report.local.project.script) {
      log.labelValue('Script:', report.local.project.script);
    }
  }
  if (report.local.llmProviders.length > 0) {
    log.label('LLM providers:');
    renderLLMProviders(report.local.llmProviders);
  }
  log.blank();

  // Global
  log.heading('Global');
  log.blank();
  if (report.global.hasConfig) {
    log.labelValue('Config:', report.global.configPath!);
  } else {
    log.labelValue('Config:', 'Not configured');
  }
  if (report.global.hasEnv) {
    log.labelValue('.env:', report.global.envPath);
  } else {
    log.labelValue('.env:', 'Not found (optional)');
  }
  if (report.global.llmProviders.length > 0) {
    log.label('LLM providers:');
    renderLLMProviders(report.global.llmProviders);
  }
  log.blank();

  // Quick Actions
  const hasIssues = !report.local.hasConfig && !report.global.hasConfig;
  const hasUnconfiguredLocal = report.local.llmProviders.some(
    p => !p.isConfigured
  );
  const hasUnconfiguredGlobal = report.global.llmProviders.some(
    p => !p.isConfigured
  );

  if (hasIssues || hasUnconfiguredLocal || hasUnconfiguredGlobal) {
    log.heading('Suggested Actions');
    log.blank();
    if (hasIssues) {
      log.label('Run syrin init to initialize a project');
    }
    if (hasUnconfiguredLocal || hasUnconfiguredGlobal) {
      log.label('Run syrin doctor for detailed diagnostics');
      log.label('Run syrin config edit-env to set API keys');
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
