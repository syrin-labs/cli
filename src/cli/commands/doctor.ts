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
        fix: 'Add `mcp_url` to your config.yaml file when using http transport',
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
        fix: 'Add `command` to your config.yaml file when using stdio transport',
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
            `Set ${apiKeyVar} in your .env file or export it in your shell`,
      },
      modelCheck: {
        isValid: modelCheck.isSet,
        message: modelVar, // Always show the env var name
        fix: modelCheck.isSet
          ? undefined
          : modelCheck.errorMessage ||
            `Set ${modelVar} in your .env file or export it in your shell`,
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

  console.log('\nSyrin Doctor Report');
  console.log('===================\n');

  // Version (we'll get this from package.json or config)
  console.log(`Syrin Version: v${String(config.version)}\n`);

  // Project info
  console.log(`MCP Project Name: ${String(config.project_name)}`);
  console.log(`Agent Name: ${String(config.agent_name)}\n`);

  // Transport
  console.log(`Transport Layer: ${config.transport}`);
  if (config.transport === 'http') {
    const urlStatus = report.transportCheck.isValid ? '✓' : '✗';
    console.log(`MCP URL: ${String(config.mcp_url || 'Missing')} ${urlStatus}`);
  } else {
    const cmdStatus = report.transportCheck.isValid ? '✓' : '✗';
    console.log(`Command: ${String(config.command || 'Missing')} ${cmdStatus}`);
  }
  if (!report.transportCheck.isValid && report.transportCheck.fix) {
    console.log(`   ⚠️  ${report.transportCheck.fix}`);
  }
  console.log('');

  // Scripts (only show if scripts section exists)
  if (report.scriptsCheck.length > 0) {
    console.log('Scripts:');
    const scriptLabels = ['dev', 'start'] as const;
    report.scriptsCheck.forEach((check, index) => {
      const label = scriptLabels[index];
      if (!label) return; // Safety check
      const script = config.scripts
        ? index === 0
          ? config.scripts.dev
          : config.scripts.start
        : 'N/A';
      const status = check.isValid ? '✓' : '✗';
      const scriptStr = config.scripts ? String(script) : 'N/A';
      const message = check.isValid ? '(working)' : check.message;
      console.log(
        `- ${label.padEnd(6)} [${scriptStr}] ${status.padEnd(10)} ${message}`
      );
      if (!check.isValid && check.fix) {
        console.log(`   ⚠️  ${check.fix}`);
      }
    });
    console.log('');
  }

  // LLM Providers
  console.log('LLMs:');
  report.llmChecks.forEach(llm => {
    const providerName =
      llm.provider.charAt(0).toUpperCase() + llm.provider.slice(1);
    const defaultMark = llm.isDefault ? ' (default)' : '';
    const apiKeyStatus = llm.apiKeyCheck.isValid ? '✓' : '✗';
    const modelStatus = llm.modelCheck.isValid ? '✓' : '✗';

    console.log(
      `- ${providerName} [${llm.apiKeyCheck.message}] ${apiKeyStatus}${defaultMark}`
    );
    if (!llm.apiKeyCheck.isValid && llm.apiKeyCheck.fix) {
      console.log(`   ⚠️  ${llm.apiKeyCheck.fix}`);
    }

    console.log(`  Model  [${llm.modelCheck.message}] ${modelStatus}`);
    if (!llm.modelCheck.isValid && llm.modelCheck.fix) {
      console.log(`   ⚠️  ${llm.modelCheck.fix}`);
    }
    console.log('');
  });

  // Local LLM Providers
  if (report.localLlmChecks && report.localLlmChecks.length > 0) {
    report.localLlmChecks.forEach(llm => {
      const status = llm.check.isValid ? '✅' : '❌';
      console.log(`- ${llm.provider} ${status} ${llm.check.message}`);
      console.log('');
    });
  }

  // Summary
  if (allValid) {
    console.log('Everything is set up well!\n');
  } else {
    console.log('⚠️  Some issues found. Please fix them before proceeding.\n');
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
      console.error(`\n❌ ${error.message}\n`);
      process.exit(1);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Doctor command failed', err);
    console.error('\n❌ An unexpected error occurred\n');
    process.exit(1);
  }
}
