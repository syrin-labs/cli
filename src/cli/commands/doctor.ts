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
import { Icons, Labels, Messages } from '@/constants';

interface CheckResult {
  isValid: boolean;
  message: string;
  fix?: string;
}

interface DoctorReport {
  config: SyrinConfig;
  transportCheck: CheckResult;
  scriptsCheck: CheckResult[];
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
    if (!config.command) {
      return {
        isValid: false,
        message: 'Command is missing',
        fix: Messages.CONFIG_ADD_COMMAND,
      };
    }
    const commandName = extractCommandName(String(config.command));
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
      message: `Command: ${String(config.command)}`,
    };
  }
}

/**
 * Check script commands.
 */
function checkScripts(config: SyrinConfig): CheckResult[] {
  const results: CheckResult[] = [];

  if (!config.scripts) {
    // Scripts section is optional, return empty array
    return results;
  }

  // Check dev script
  const devCommand = extractCommandName(String(config.scripts.dev));
  const devCommandExists = checkCommandExists(devCommand);
  results.push({
    isValid: devCommandExists,
    message: devCommandExists ? 'working' : `Command "${devCommand}" not found`,
    fix: devCommandExists
      ? undefined
      : `Make sure "${devCommand}" is installed and available in your PATH`,
  });

  // Check start script
  const startCommand = extractCommandName(String(config.scripts.start));
  const startCommandExists = checkCommandExists(startCommand);
  results.push({
    isValid: startCommandExists,
    message: startCommandExists
      ? 'working'
      : `Command "${startCommand}" not found`,
    fix: startCommandExists
      ? undefined
      : `Make sure "${startCommand}" is installed and available in your PATH`,
  });

  return results;
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
    scriptsCheck: checkScripts(config),
    llmChecks: checkLLMProviders(config, projectRoot),
    localLlmChecks: checkLocalLLMProviders(config),
  };
}

/**
 * Display doctor report in a formatted way.
 */
function displayReport(report: DoctorReport): void {
  const config = report.config;
  const allValid =
    report.transportCheck.isValid &&
    (report.scriptsCheck.length === 0 ||
      report.scriptsCheck.every(s => s.isValid)) &&
    report.llmChecks.every(l => l.apiKeyCheck.isValid && l.modelCheck.isValid);

  console.log(`\n${Labels.DOCTOR_REPORT_TITLE}`);
  console.log('===================\n');

  // Version (we'll get this from package.json or config)
  console.log(`${Labels.SYRIN_VERSION} v${String(config.version)}\n`);

  // Project info
  console.log(`${Labels.MCP_PROJECT_NAME} ${String(config.project_name)}`);
  console.log(`${Labels.AGENT_NAME} ${String(config.agent_name)}\n`);

  // Transport
  console.log(`${Labels.TRANSPORT_LAYER} ${config.transport}`);
  if (config.transport === 'http') {
    const urlStatus = report.transportCheck.isValid
      ? Icons.SUCCESS
      : Icons.FAILURE;
    console.log(
      `${Labels.MCP_URL} ${String(config.mcp_url || Labels.STATUS_MISSING)} ${urlStatus}`
    );
  } else {
    const cmdStatus = report.transportCheck.isValid
      ? Icons.SUCCESS
      : Icons.FAILURE;
    console.log(
      `${Labels.COMMAND} ${String(config.command || Labels.STATUS_MISSING)} ${cmdStatus}`
    );
  }
  if (!report.transportCheck.isValid && report.transportCheck.fix) {
    console.log(`   ${Icons.WARNING}  ${report.transportCheck.fix}`);
  }
  console.log('');

  // Scripts (only show if scripts section exists)
  if (report.scriptsCheck.length > 0) {
    console.log(`${Labels.SCRIPTS}`);
    const scriptLabels = [Labels.SCRIPT_DEV, Labels.SCRIPT_START] as const;
    report.scriptsCheck.forEach((check, index) => {
      const label = scriptLabels[index];
      if (!label) return; // Safety check
      const script = config.scripts
        ? index === 0
          ? config.scripts.dev
          : config.scripts.start
        : Labels.STATUS_NA;
      const status = check.isValid ? Icons.SUCCESS : Icons.FAILURE;
      const scriptStr = config.scripts ? String(script) : Labels.STATUS_NA;
      const message = check.isValid ? Labels.STATUS_WORKING : check.message;
      console.log(
        `- ${label.padEnd(6)} [${scriptStr}] ${status.padEnd(10)} ${message}`
      );
      if (!check.isValid && check.fix) {
        console.log(`   ${Icons.WARNING}  ${check.fix}`);
      }
    });
    console.log('');
  }

  // LLM Providers
  console.log(`${Labels.LLMS}`);
  report.llmChecks.forEach(llm => {
    const providerName =
      llm.provider.charAt(0).toUpperCase() + llm.provider.slice(1);
    const defaultMark = llm.isDefault ? ` ${Labels.STATUS_DEFAULT}` : '';
    const apiKeyStatus = llm.apiKeyCheck.isValid
      ? Icons.SUCCESS
      : Icons.FAILURE;
    const modelStatus = llm.modelCheck.isValid ? Icons.SUCCESS : Icons.FAILURE;

    console.log(
      `- ${providerName} [${llm.apiKeyCheck.message}] ${apiKeyStatus}${defaultMark}`
    );
    if (!llm.apiKeyCheck.isValid && llm.apiKeyCheck.fix) {
      console.log(`   ${Icons.WARNING}  ${llm.apiKeyCheck.fix}`);
    }

    console.log(
      `  ${Labels.MODEL}  [${llm.modelCheck.message}] ${modelStatus}`
    );
    if (!llm.modelCheck.isValid && llm.modelCheck.fix) {
      console.log(`   ${Icons.WARNING}  ${llm.modelCheck.fix}`);
    }
    console.log('');
  });

  // Local LLM Providers
  if (report.localLlmChecks && report.localLlmChecks.length > 0) {
    report.localLlmChecks.forEach(llm => {
      const status = llm.check.isValid ? Icons.CHECK : Icons.ERROR;
      console.log(`- ${llm.provider} ${status} ${llm.check.message}`);
      console.log('');
    });
  }

  // Summary
  if (allValid) {
    console.log(`${Messages.DOCTOR_SETUP_SUCCESS}\n`);
  } else {
    console.log(`${Icons.WARNING}  ${Messages.DOCTOR_ISSUES_FOUND}\n`);
  }
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

    // Display report
    displayReport(report);

    // Exit with appropriate code
    const allValid =
      report.transportCheck.isValid &&
      (report.scriptsCheck.length === 0 ||
        report.scriptsCheck.every(s => s.isValid)) &&
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
