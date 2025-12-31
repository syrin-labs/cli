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
import { handleCommandError } from '@/cli/utils';
import type { SyrinConfig } from '@/config/types';
import { Messages, TransportTypes, Defaults, LLMProviders } from '@/constants';
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
  if (config.transport === TransportTypes.HTTP) {
    if (!config.mcp_url) {
      return {
        isValid: false,
        message: 'MCP URL is missing',
        fix: Messages.CONFIG_ADD_MCP_URL,
      };
    }
    return {
      isValid: true,
      message: Messages.DOCTOR_MCP_URL_INFO(String(config.mcp_url)),
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
  projectRoot: string
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

  for (const [providerName] of Object.entries(config.llm)) {
    if (providerName === LLMProviders.OLLAMA) {
      checks.push({
        provider: providerName,
        check: {
          isValid: true,
          message: Defaults.WORKING,
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
export async function executeDoctor(
  projectRoot: string = process.cwd()
): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig(projectRoot);

    // Generate report
    const report = generateReport(config, projectRoot);

    // Display report using Ink UI
    await displayDoctorReport(report);

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
    handleCommandError(error);
  }
}
