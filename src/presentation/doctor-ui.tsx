import { getVersionDisplayString } from '@/utils/version-display';
import { log } from '@/utils/logger';

/**
 * Presentation layer for doctor command UI.
 * Provides modern, minimalistic display for configuration validation results.
 */

interface CheckResult {
  isValid: boolean;
  message: string;
  fix?: string;
  value?: string; // Actual value (for API keys and model names)
}

interface DoctorReport {
  config: {
    version: unknown;
    project_name: unknown;
    agent_name: unknown;
    transport: string;
    mcp_url?: unknown;
    script?: unknown;
  };
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
    modelName?: string; // Model name for local LLM providers
  }>;
}

/**
 * Display doctor report using plain console output.
 * This avoids Ink taking control of stdin, which disables terminal history.
 */
export async function displayDoctorReport(report: DoctorReport): Promise<void> {
  const { config, transportCheck, scriptCheck, llmChecks, localLlmChecks } =
    report;

  const allValid =
    transportCheck.isValid &&
    (scriptCheck === null || scriptCheck.isValid) &&
    llmChecks.every(l => l.apiKeyCheck.isValid && l.modelCheck.isValid);

  // Get version info for display
  const versionDisplayString = await getVersionDisplayString('@ankan-ai/syrin');

  // Header
  log.blank();
  log.heading('Syrin Doctor Report');
  log.label('═══════════════════');
  log.labelValue('Version:', versionDisplayString);
  log.blank();

  // Project Info
  log.labelValue('Project:', String(config.project_name));
  log.labelValue('Agent:', String(config.agent_name));
  log.blank();

  // Transport Section
  log.heading('Transport');
  log.labelValue('  Type:', config.transport);
  if (config.transport === 'http') {
    const urlValue =
      config.mcp_url !== undefined && config.mcp_url !== null
        ? (config.mcp_url as unknown as string)
        : null;
    const urlText = urlValue ? `URL: ${urlValue}` : 'URL: Not configured';
    if (transportCheck.isValid) {
      log.plain(`  ${urlText} ${log.tick()}`);
    } else {
      log.plain(`  ${urlText} ${log.cross()}`);
    }
  } else {
    const scriptValue =
      config.script !== undefined && config.script !== null
        ? (config.script as unknown as string)
        : null;
    const scriptText = scriptValue
      ? `Script: ${scriptValue}`
      : 'Script: Not configured';
    if (transportCheck.isValid) {
      log.plain(`  ${scriptText} ${log.tick()}`);
    } else {
      log.plain(`  ${scriptText} ${log.cross()}`);
    }
  }
  if (!transportCheck.isValid && transportCheck.fix) {
    log.warnSymbol(`    ${transportCheck.fix}`);
  }
  log.blank();

  // Script Section (if present)
  if (scriptCheck !== null && config.script) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const scriptText = String(config.script);
    log.heading('Script');
    if (scriptCheck.isValid) {
      log.plain(`  ${scriptText} ${log.tick()}`);
    } else {
      log.plain(`  ${scriptText} ${log.cross()}`);
    }
    if (!scriptCheck.isValid && scriptCheck.fix) {
      log.warnSymbol(`    ${scriptCheck.fix}`);
    }
    log.blank();
  }

  /**
   * Mask API key to show only first few characters.
   */
  function maskApiKey(apiKey: string | undefined): string {
    if (!apiKey) return '';
    if (apiKey.length <= 4) return '****';
    return `${apiKey.substring(0, 4)}*****`;
  }

  // LLM Providers Section
  if (llmChecks.length > 0) {
    log.heading('LLM Providers');
    for (const llm of llmChecks) {
      const providerName =
        llm.provider.charAt(0).toUpperCase() + llm.provider.slice(1);
      const defaultMark = llm.isDefault
        ? log.styleText(' (default)', 'cyan')
        : '';
      log.plain(`  ${log.styleText(providerName, 'bold')}${defaultMark}`);

      // API Key
      const apiKeyValue = llm.apiKeyCheck.value
        ? ` (${maskApiKey(llm.apiKeyCheck.value)})`
        : '';
      const apiKeyLabel = `    API Key: [${llm.apiKeyCheck.message}]${apiKeyValue}`;
      if (llm.apiKeyCheck.isValid) {
        log.plain(`${apiKeyLabel} ${log.tick()}`);
      } else {
        log.plain(`${apiKeyLabel} ${log.cross()}`);
      }
      if (!llm.apiKeyCheck.isValid && llm.apiKeyCheck.fix) {
        log.warnSymbol(`      ${llm.apiKeyCheck.fix}`);
      }

      // Model
      const modelValue = llm.modelCheck.value
        ? ` (${llm.modelCheck.value})`
        : '';
      const modelLabel = `    Model: [${llm.modelCheck.message}]${modelValue}`;
      if (llm.modelCheck.isValid) {
        log.plain(`${modelLabel} ${log.tick()}`);
      } else {
        log.plain(`${modelLabel} ${log.cross()}`);
      }
      if (!llm.modelCheck.isValid && llm.modelCheck.fix) {
        log.warnSymbol(`      ${llm.modelCheck.fix}`);
      }
    }
    log.blank();
  }

  // Local LLM Providers
  if (localLlmChecks && localLlmChecks.length > 0) {
    log.heading('Local LLM Providers');
    for (const llm of localLlmChecks) {
      log.plain(`  ${llm.provider}`);
      if (llm.modelName) {
        const modelLabel = `    Model: ${llm.modelName}`;
        if (llm.check.isValid) {
          log.plain(`${modelLabel} ${log.tick()}`);
        } else {
          log.plain(`${modelLabel} ${log.cross()}`);
        }
      } else if (llm.check.isValid) {
        log.plain(`    ${log.tick()}`);
      } else {
        log.plain(`    ${log.cross()}`);
      }
    }
    log.blank();
  }

  // Summary
  if (allValid) {
    log.success('All checks passed');
    log.blank();
  } else {
    log.warning('Some issues found');
    log.blank();
  }
}
