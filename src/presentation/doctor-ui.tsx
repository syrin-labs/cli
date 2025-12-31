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
      const apiKeyLabel = `    API Key: [${llm.apiKeyCheck.message}]`;
      if (llm.apiKeyCheck.isValid) {
        log.plain(`${apiKeyLabel} ${log.tick()}`);
      } else {
        log.plain(`${apiKeyLabel} ${log.cross()}`);
      }
      if (!llm.apiKeyCheck.isValid && llm.apiKeyCheck.fix) {
        log.warnSymbol(`      ${llm.apiKeyCheck.fix}`);
      }

      // Model
      const modelLabel = `    Model: [${llm.modelCheck.message}]`;
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
      if (llm.check.isValid) {
        log.plain(`  ${llm.provider} ${log.tick()}`);
      } else {
        log.plain(`  ${llm.provider} ${log.cross()}`);
      }
    }
    log.blank();
  }

  // Summary
  if (allValid) {
    log.success('All checks passed');
    log.blank();
  } else {
    log.warning('⚠  Some issues found');
    log.blank();
  }
}
