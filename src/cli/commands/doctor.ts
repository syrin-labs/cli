/**
 * `syrin doctor` command implementation.
 * Validates the Syrin project configuration and setup.
 */

import { loadConfig } from '@/config/loader';
import {
  checkEnvVar,
  checkCommandExists,
  extractCommandName,
} from '@/config/env-checker';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { SyrinConfig } from '@/config/types';
import { Icons, Messages } from '@/constants';
import { displayDoctorReport } from '@/presentation/doctor-ui';

interface CheckResult {
  isValid: boolean;
  message: string;
  fix?: string;
}

interface DoctorReport {
  config: SyrinConfig;
  transportCheck: CheckResult;
  scriptCheck: CheckResult | null;
  llmChecks: Array<{
    provider: string;
    apiKeyCheck: CheckResult;
    modelCheck: CheckResult;
    isDefault: boolean;
  }>;
  localLlmChecks?: Array<{
    provider: string;
    check: CheckResult;
  }>;
}

/**
 * Check transport configuration.
 */
function checkTransport(config: SyrinConfig): CheckResult {
  if (config.transport === 'http') {
    if (!config.mcp_url) {
      return {
        isValid: false,
        message: 'MCP URL is missing',
        fix: Messages.CONFIG_ADD_MCP_URL,
      };
    }
    return {
      isValid: true,
      message: `MCP URL: ${String(config.mcp_url)}`,
    };
  } else {
    // stdio transport
    if (!config.script) {
      return {
        isValid: false,
        message: 'script is missing',
        fix: 'Add script to your config.yaml file when using stdio transport',
      };
    }
    const commandName = extractCommandName(String(config.script));
    const commandExists = checkCommandExists(commandName);
    if (!commandExists) {
      return {
        isValid: false,
        message: `Command "${commandName}" not found in PATH`,
        fix: `Make sure "${commandName}" is installed and available in your PATH`,
      };
    }
    return {
      isValid: true,
      message: `Script: ${String(config.script)}`,
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
      message: 'working',
    };
  }

  const commandExists = checkCommandExists(commandName);
  return {
    isValid: commandExists,
    message: commandExists ? 'working' : `Command "${commandName}" not found`,
    fix: commandExists
      ? undefined
      : `Make sure "${commandName}" is installed and available in your PATH`,
  };
}

/**
 * Check LLM provider configuration.
 */
function checkLLMProviders(
  config: SyrinConfig,
  projectRoot: string
): DoctorReport['llmChecks'] {
  const checks: DoctorReport['llmChecks'] = [];

  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    if (providerName === 'llama' || providerConfig.provider) {
      // Local LLM provider - skip API key checks
      continue;
    }

    // Cloud provider - check API key and model name
    const apiKeyVar = providerConfig.API_KEY
      ? String(providerConfig.API_KEY)
      : '';
    const modelVar = providerConfig.MODEL_NAME
      ? String(providerConfig.MODEL_NAME)
      : '';

    const apiKeyCheck = checkEnvVar(apiKeyVar, projectRoot);
    const modelCheck = checkEnvVar(modelVar, projectRoot);

    checks.push({
      provider: providerName,
      apiKeyCheck: {
        isValid: apiKeyCheck.isSet,
        message: apiKeyVar, // Always show the env var name
        fix: apiKeyCheck.isSet
          ? undefined
          : apiKeyCheck.errorMessage ||
            Messages.ENV_SET_INSTRUCTIONS(apiKeyVar),
      },
      modelCheck: {
        isValid: modelCheck.isSet,
        message: modelVar, // Always show the env var name
        fix: modelCheck.isSet
          ? undefined
          : modelCheck.errorMessage || Messages.ENV_SET_INSTRUCTIONS(modelVar),
      },
      isDefault: providerConfig.default === true,
    });
  }

  return checks;
}

/**
 * Check local LLM providers.
 */
function checkLocalLLMProviders(
  config: SyrinConfig
): DoctorReport['localLlmChecks'] {
  const checks: DoctorReport['localLlmChecks'] = [];

  for (const [providerName, providerConfig] of Object.entries(config.llm)) {
    if (providerName === 'llama' || providerConfig.provider) {
      checks.push({
        provider: providerName,
        check: {
          isValid: true,
          message: 'working',
        },
      });
    }
  }

  return checks.length > 0 ? checks : undefined;
}

/**
 * Generate doctor report.
 */
function generateReport(
  config: SyrinConfig,
  projectRoot: string
): DoctorReport {
  return {
    config,
    transportCheck: checkTransport(config),
    scriptCheck: checkScript(config),
    llmChecks: checkLLMProviders(config, projectRoot),
    localLlmChecks: checkLocalLLMProviders(config),
  };
}

/**
 * Execute the doctor command.
 * @param projectRoot - Project root directory (defaults to current working directory)
 */
export function executeDoctor(projectRoot: string = process.cwd()): void {
  try {
    // Load configuration
    const config = loadConfig(projectRoot);

    // Generate report
    const report = generateReport(config, projectRoot);

    // Display report using Ink UI
    displayDoctorReport(report);

    // Exit with appropriate code
    const allValid =
      report.transportCheck.isValid &&
      (report.scriptCheck === null || report.scriptCheck.isValid) &&
      report.llmChecks.every(
        l => l.apiKeyCheck.isValid && l.modelCheck.isValid
      );

    if (!allValid) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Doctor command failed', err);
    console.error(`\n${Icons.ERROR} ${Messages.ERROR_UNEXPECTED}\n`);
    process.exit(1);
  }
}
