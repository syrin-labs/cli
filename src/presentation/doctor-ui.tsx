/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument,
   @typescript-eslint/no-implied-eval
*/

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
 * Display doctor report using Ink.
 */
export function displayDoctorReport(report: DoctorReport): void {
  const importDynamic = new Function('specifier', 'return import(specifier)');
  void (async (): Promise<void> => {
    const [ReactModule, inkModule] = await Promise.all([
      importDynamic('react'),
      importDynamic('ink'),
    ]);

    const React = ReactModule.default || ReactModule;
    const { Box, Text, render } = inkModule;

    const DoctorReportComponent = (): React.ReactElement => {
      const { config, transportCheck, scriptCheck, llmChecks, localLlmChecks } =
        report;

      const allValid =
        transportCheck.isValid &&
        (scriptCheck === null || scriptCheck.isValid) &&
        llmChecks.every(l => l.apiKeyCheck.isValid && l.modelCheck.isValid);

      const elements: React.ReactElement[] = [];

      // Header
      elements.push(
        React.createElement(
          Box,
          { key: 'header', flexDirection: 'column', marginBottom: 2 },
          React.createElement(
            Box,
            { marginBottom: 0.5 },
            React.createElement(Text, { bold: true }, 'Syrin Doctor Report')
          ),
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(Text, { dimColor: true }, '═══════════════════')
          ),
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(
              Text,
              { dimColor: true },
              `Version: v${String(config.version)}`
            )
          )
        )
      );

      // Project Info
      elements.push(
        React.createElement(
          Box,
          { key: 'project', flexDirection: 'column', marginBottom: 1.5 },
          React.createElement(
            Box,
            { marginBottom: 0.5 },
            React.createElement(
              Text,
              { dimColor: true },
              `Project: ${String(config.project_name)}`
            )
          ),
          React.createElement(
            Box,
            { marginBottom: 0.5 },
            React.createElement(
              Text,
              { dimColor: true },
              `Agent: ${String(config.agent_name)}`
            )
          )
        )
      );

      // Transport Section
      elements.push(
        React.createElement(
          Box,
          { key: 'transport', flexDirection: 'column', marginBottom: 1.5 },
          React.createElement(
            Box,
            { marginBottom: 0.5 },
            React.createElement(Text, { bold: true }, 'Transport')
          ),
          React.createElement(
            Box,
            { marginLeft: 2, marginBottom: 0.5 },
            React.createElement(
              Text,
              { dimColor: true },
              `Type: ${config.transport}`
            )
          ),
          config.transport === 'http'
            ? ((): React.ReactElement => {
                const urlText =
                  config.mcp_url !== undefined && config.mcp_url !== null
                    ? 'URL: ' + String(config.mcp_url)
                    : 'URL: Not configured';
                return React.createElement(
                  Box,
                  { marginLeft: 2, marginBottom: 0.5 },
                  React.createElement(Text, {}, urlText),
                  transportCheck.isValid
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : React.createElement(Text, { color: 'red' }, ' ✗')
                );
              })()
            : ((): React.ReactElement => {
                const scriptText =
                  config.script !== undefined && config.script !== null
                    ? 'Script: ' + String(config.script)
                    : 'Script: Not configured';
                return React.createElement(
                  Box,
                  { marginLeft: 2, marginBottom: 0.5 },
                  React.createElement(Text, {}, scriptText),
                  transportCheck.isValid
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : React.createElement(Text, { color: 'red' }, ' ✗')
                );
              })(),
          !transportCheck.isValid && transportCheck.fix
            ? React.createElement(
                Box,
                { marginLeft: 4, marginTop: 0.5 },
                React.createElement(
                  Text,
                  { color: 'yellow', dimColor: true },
                  `⚠  ${transportCheck.fix}`
                )
              )
            : null
        )
      );

      // Script Section (if present)
      if (scriptCheck !== null && config.script) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const scriptText = String(config.script);
        elements.push(
          React.createElement(
            Box,
            { key: 'script', flexDirection: 'column', marginBottom: 1.5 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(Text, { bold: true }, 'Script')
            ),
            React.createElement(
              Box,
              { marginLeft: 2, marginBottom: 0.5 },
              React.createElement(Text, { dimColor: true }, scriptText),
              scriptCheck.isValid
                ? React.createElement(Text, { color: 'green' }, ' ✓')
                : React.createElement(Text, { color: 'red' }, ' ✗')
            ),
            !scriptCheck.isValid && scriptCheck.fix
              ? React.createElement(
                  Box,
                  { marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Text,
                    { color: 'yellow', dimColor: true },
                    `⚠  ${scriptCheck.fix}`
                  )
                )
              : null
          )
        );
      }

      // LLM Providers Section
      if (llmChecks.length > 0) {
        elements.push(
          React.createElement(
            Box,
            { key: 'llms', flexDirection: 'column', marginBottom: 1.5 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(Text, { bold: true }, 'LLM Providers')
            ),
            ...llmChecks.flatMap((llm): React.ReactElement[] => {
              const providerName =
                llm.provider.charAt(0).toUpperCase() + llm.provider.slice(1);
              const defaultMark = llm.isDefault ? ' (default)' : '';
              const providerElements: React.ReactElement[] = [];

              providerElements.push(
                React.createElement(
                  Box,
                  {
                    key: `${llm.provider}-header`,
                    marginLeft: 2,
                    marginBottom: 0.5,
                  },
                  React.createElement(
                    Text,
                    { bold: true },
                    `${providerName}${defaultMark}`
                  )
                )
              );

              // API Key
              providerElements.push(
                React.createElement(
                  Box,
                  {
                    key: `${llm.provider}-apikey`,
                    marginLeft: 4,
                    marginBottom: 0.25,
                  },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    `API Key: [${llm.apiKeyCheck.message}]`
                  ),
                  llm.apiKeyCheck.isValid
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : React.createElement(Text, { color: 'red' }, ' ✗')
                )
              );
              if (!llm.apiKeyCheck.isValid && llm.apiKeyCheck.fix) {
                providerElements.push(
                  React.createElement(
                    Box,
                    {
                      key: `${llm.provider}-apikey-fix`,
                      marginLeft: 6,
                      marginTop: 0.25,
                    },
                    React.createElement(
                      Text,
                      { color: 'yellow', dimColor: true },
                      `⚠  ${llm.apiKeyCheck.fix}`
                    )
                  )
                );
              }

              // Model
              providerElements.push(
                React.createElement(
                  Box,
                  {
                    key: `${llm.provider}-model`,
                    marginLeft: 4,
                    marginBottom: 0.5,
                  },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    `Model: [${llm.modelCheck.message}]`
                  ),
                  llm.modelCheck.isValid
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : React.createElement(Text, { color: 'red' }, ' ✗')
                )
              );
              if (!llm.modelCheck.isValid && llm.modelCheck.fix) {
                providerElements.push(
                  React.createElement(
                    Box,
                    {
                      key: `${llm.provider}-model-fix`,
                      marginLeft: 6,
                      marginTop: 0.25,
                    },
                    React.createElement(
                      Text,
                      { color: 'yellow', dimColor: true },
                      `⚠  ${llm.modelCheck.fix}`
                    )
                  )
                );
              }

              return providerElements;
            })
          )
        );
      }

      // Local LLM Providers
      if (localLlmChecks && localLlmChecks.length > 0) {
        elements.push(
          React.createElement(
            Box,
            { key: 'local-llms', flexDirection: 'column', marginBottom: 1.5 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(Text, { bold: true }, 'Local LLM Providers')
            ),
            ...localLlmChecks.map(
              llm =>
                React.createElement(
                  Box,
                  { key: llm.provider, marginLeft: 2, marginBottom: 0.5 },
                  React.createElement(Text, {}, llm.provider),
                  llm.check.isValid
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : React.createElement(Text, { color: 'red' }, ' ✗')
                ) as React.ReactElement
            )
          )
        );
      }

      // Summary
      elements.push(
        React.createElement(
          Box,
          { key: 'summary', marginTop: 1 },
          allValid
            ? React.createElement(
                Text,
                { color: 'green', bold: true },
                '✓ All checks passed'
              )
            : React.createElement(
                Text,
                { color: 'yellow', bold: true },
                '⚠  Some issues found'
              )
        )
      );

      return React.createElement(
        Box,
        { flexDirection: 'column', paddingX: 1 },
        ...elements
      );
    };

    const instance = render(React.createElement(DoctorReportComponent), {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      patchConsole: false,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    instance.unmount();
  })();
}
