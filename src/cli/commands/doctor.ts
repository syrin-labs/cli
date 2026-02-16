/**
 * `syrin doctor` command implementation.
 * Validates the Syrin project configuration and setup.
 */

import { loadConfigOptional } from '@/config/loader';
import {
  checkEnvVar,
  checkCommandExists,
  extractCommandName,
} from '@/config/env-checker';
import { handleCommandError } from '@/cli/utils';
import { showVersionBanner } from '@/cli/utils/version-banner';
import type { SyrinConfig } from '@/config/types';
import {
  Messages,
  TransportTypes,
  Defaults,
  LLMProviders,
  Paths,
} from '@/constants';
import {
  displayDoctorReport,
  displayGlobalConfigValidation,
} from '@/presentation/doctor-ui';
import {
  loadGlobalConfig,
  getGlobalConfigPath,
  getGlobalEnvPath,
} from '@/config/global-loader';
import { connectHTTP } from '@/runtime/mcp/connection';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface CheckResult {
  isValid: boolean;
  message: string;
  fix?: string;
  value?: string; // Actual value (for API keys and model names)
}

interface DoctorReport {
  config: SyrinConfig;
  configSource?: 'local' | 'global';
  configPath?: string;
  envSource?: 'local.env' | 'global.env' | 'process.env';
  transportCheck: CheckResult;
  mcpConnectivityCheck?: CheckResult;
  scriptCheck: CheckResult | null;
  llmChecks: Array<{
    provider: string;
    apiKeyCheck: CheckResult;
    modelCheck: CheckResult;
    isDefault: boolean;
    envSource?: 'local.env' | 'global.env' | 'process.env';
  }>;
  localLlmChecks?: Array<{
    provider: string;
    check: CheckResult;
    modelName?: string; // Model name for local LLM providers
  }>;
}

/**
 * Check transport configuration.
 */
function checkTransport(config: SyrinConfig): CheckResult {
  if (config.transport === TransportTypes.HTTP) {
    if (!config.url) {
      return {
        isValid: false,
        message: 'MCP URL is missing',
        fix: Messages.CONFIG_ADD_MCP_URL,
      };
    }
    return {
      isValid: true,
      message: Messages.DOCTOR_MCP_URL_INFO(String(config.url)),
    };
  } else {
    // stdio transport
    if (!config.script) {
      return {
        isValid: false,
        message: Messages.DOCTOR_SCRIPT_MISSING,
        fix: Messages.CONFIG_ADD_SCRIPT_STDIO,
      };
    }
    const commandName = extractCommandName(String(config.script));
    const commandExists = checkCommandExists(commandName);
    if (!commandExists) {
      return {
        isValid: false,
        message: Messages.DOCTOR_COMMAND_NOT_FOUND(commandName),
        fix: Messages.DOCTOR_COMMAND_INSTALL(commandName),
      };
    }
    return {
      isValid: true,
      message: Messages.DOCTOR_SCRIPT_INFO(String(config.script)),
    };
  }
}

/**
 * Test MCP server connectivity.
 * Attempts to connect to the MCP server and verify it's responding.
 */
async function testMCPConnectivity(config: SyrinConfig): Promise<CheckResult> {
  if (config.transport === TransportTypes.HTTP) {
    if (!config.url) {
      return {
        isValid: false,
        message: 'MCP URL is missing',
      };
    }

    try {
      const result = await connectHTTP(String(config.url), undefined, 5000);
      if (result.success) {
        return {
          isValid: true,
          message: `Successfully connected to MCP server at ${config.url}`,
        };
      } else {
        return {
          isValid: false,
          message: `Failed to connect to MCP server: ${result.error || 'Unknown error'}`,
          fix: 'Ensure the MCP server is running and the URL is correct',
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        message: `Failed to connect to MCP server: ${errorMessage}`,
        fix: 'Ensure the MCP server is running and the URL is correct',
      };
    }
  } else {
    return {
      isValid: true,
      message:
        'Skipping connectivity check for stdio transport (requires server to be running)',
    };
  }
}

/**
 * Check script command.
 */
function checkScript(config: SyrinConfig): CheckResult | null {
  if (!config.script) {
    // Script is optional for HTTP transport
    return null;
  }

  const script = String(config.script);

  // Skip validation for scripts that contain shell built-ins or compound commands
  // These are typically complex shell scripts that can't be validated with simple command checking
  // Common shell built-ins: source, cd, export, unset, alias, etc.
  const shellBuiltIns = [
    'source',
    'cd',
    'export',
    'unset',
    'alias',
    'set',
    'unsetenv',
  ];
  const commandName = extractCommandName(script);

  // If the first command is a shell built-in, skip validation
  // Scripts with shell built-ins are expected to be run in a shell context
  if (shellBuiltIns.includes(commandName)) {
    return {
      isValid: true, // Assume valid if it uses shell built-ins (will be executed in shell)
      message: Defaults.WORKING,
    };
  }

  const commandExists = checkCommandExists(commandName);
  return {
    isValid: commandExists,
    message: commandExists
      ? Defaults.WORKING
      : Messages.DOCTOR_COMMAND_NOT_FOUND(commandName),
    fix: commandExists
      ? undefined
      : Messages.DOCTOR_COMMAND_INSTALL(commandName),
  };
}

/**
 * Check LLM provider configuration.
 */
function checkLLMProviders(
  config: SyrinConfig,
  projectRoot: string,
  isGlobalContext: boolean = false
): DoctorReport['llmChecks'] {
  const checks: DoctorReport['llmChecks'] = [];

  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    if (providerName === LLMProviders.OLLAMA) {
      // Ollama provider - skip API key checks (only MODEL_NAME is needed)
      continue;
    }

    // Cloud provider - check API key and model name
    const apiKeyVar = providerConfig.API_KEY
      ? String(providerConfig.API_KEY)
      : '';
    const modelVar = providerConfig.MODEL_NAME
      ? String(providerConfig.MODEL_NAME)
      : '';

    const apiKeyCheck = checkEnvVar(apiKeyVar, projectRoot, isGlobalContext);
    const modelCheck = checkEnvVar(modelVar, projectRoot, isGlobalContext);

    checks.push({
      provider: providerName,
      apiKeyCheck: {
        isValid: apiKeyCheck.isSet,
        message: apiKeyVar, // Always show the env var name
        value: apiKeyCheck.value, // Actual API key value (for masking)
        fix: apiKeyCheck.isSet
          ? undefined
          : apiKeyCheck.errorMessage ||
            Messages.ENV_SET_INSTRUCTIONS(apiKeyVar),
      },
      modelCheck: {
        isValid: modelCheck.isSet,
        message: modelVar, // Always show the env var name
        value: modelCheck.value, // Actual model name value
        fix: modelCheck.isSet
          ? undefined
          : modelCheck.errorMessage || Messages.ENV_SET_INSTRUCTIONS(modelVar),
      },
      isDefault: providerConfig.default === true,
      envSource: apiKeyCheck.source || modelCheck.source,
    });
  }

  return checks;
}

/**
 * Check local LLM providers.
 */
function checkLocalLLMProviders(
  config: SyrinConfig,
  projectRoot: string,
  isGlobalContext: boolean = false
): DoctorReport['localLlmChecks'] {
  const checks: DoctorReport['localLlmChecks'] = [];

  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    if (providerName === LLMProviders.OLLAMA) {
      // Get model name for Ollama
      const modelVar = providerConfig.MODEL_NAME
        ? String(providerConfig.MODEL_NAME)
        : '';
      const modelCheck = checkEnvVar(modelVar, projectRoot, isGlobalContext);

      checks.push({
        provider: providerName,
        check: {
          isValid: modelCheck.isSet,
          message: Defaults.WORKING,
        },
        modelName: modelCheck.value, // Actual model name
      });
    }
  }

  return checks.length > 0 ? checks : undefined;
}

/**
 * Generate doctor report.
 */
async function generateReport(
  config: SyrinConfig,
  projectRoot: string,
  configSource: 'local' | 'global',
  configPath: string
): Promise<DoctorReport> {
  // Call checkLLMProviders once and reuse the result
  const llmChecks = checkLLMProviders(config, projectRoot);
  const envSource = llmChecks[0]?.envSource;

  // Test MCP server connectivity
  const mcpConnectivityCheck = await testMCPConnectivity(config);

  return {
    config,
    configSource,
    configPath,
    envSource,
    transportCheck: checkTransport(config),
    mcpConnectivityCheck,
    scriptCheck: checkScript(config),
    llmChecks,
    localLlmChecks: checkLocalLLMProviders(config, projectRoot),
  };
}

/**
 * Execute the doctor command.
 * @param projectRoot - Project root directory (defaults to current working directory)
 */
export async function executeDoctor(
  projectRoot: string = process.cwd()
): Promise<void> {
  await showVersionBanner();

  try {
    // Try to load local config first
    const localConfig = loadConfigOptional(projectRoot);
    const globalConfig = loadGlobalConfig();

    let config: SyrinConfig;
    let configSource: 'local' | 'global';
    let configPath: string;

    if (localConfig) {
      config = localConfig;
      configSource = 'local';
      configPath = path.join(projectRoot, Paths.CONFIG_FILE);
    } else if (globalConfig) {
      // Validate global config (including LLM providers)
      const globalEnvPath = getGlobalEnvPath();
      const globalEnvExists = fs.existsSync(globalEnvPath);

      // Run LLM validation for global config (using home directory as project root)
      const globalProjectRoot = os.homedir();
      const llmChecks = checkLLMProviders(
        globalConfig as SyrinConfig,
        globalProjectRoot,
        true
      );

      // Display validation results using presentation layer
      displayGlobalConfigValidation(
        getGlobalConfigPath(),
        globalEnvPath,
        globalEnvExists,
        llmChecks
      );
      return;
    } else {
      throw new Error(
        'No configuration found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
      );
    }

    // Generate report
    const report = await generateReport(
      config,
      projectRoot,
      configSource,
      configPath
    );

    // Display report using Ink UI
    await displayDoctorReport(report);

    // Exit with appropriate code
    const allValid =
      report.transportCheck.isValid &&
      (report.mcpConnectivityCheck === undefined ||
        report.mcpConnectivityCheck.isValid) &&
      (report.scriptCheck === null || report.scriptCheck.isValid) &&
      report.llmChecks.every(
        l => l.apiKeyCheck.isValid && l.modelCheck.isValid
      );

    if (!allValid) {
      process.exit(1);
    }
  } catch (error) {
    handleCommandError(error);
  }
}
