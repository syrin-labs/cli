/**
 * Test Results UI for MCP Connection Testing using Ink.
 * Provides a minimalistic, easy-to-read display of connection test results.
 *
 * Note: React and Ink are dynamically imported to avoid ESM/CommonJS issues.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-implied-eval
*/
import type { MCPConnectionResult } from '@/runtime/mcp/types';
import type { TransportType } from '@/config/types';
import { checkVersion, getCurrentVersion } from '@/utils/version-checker';

export interface TestResultsUIOptions {
  /** Connection test result to display */
  result: MCPConnectionResult;
  /** Transport type being tested */
  transport: TransportType;
  /** Whether to show verbose details (HTTP request/response) */
  verbose?: boolean;
}

/**
 * Get human-readable explanation for capability properties.
 */
function explainCapabilityProperty(
  capabilityName: string,
  propertyName: string
): string {
  const explanations: Record<string, Record<string, string>> = {
    tools: {
      listChanged:
        'Server sends notifications when the list of available tools changes',
    },
    prompts: {
      listChanged:
        'Server sends notifications when the list of available prompts changes',
    },
    resources: {
      listChanged:
        'Server sends notifications when the list of available resources changes',
      subscribe: 'Server supports subscribing to resource updates',
    },
    tasks: {
      list: 'Server supports listing tasks',
      cancel: 'Server supports cancelling tasks',
      'requests.tools.call':
        'Server supports task-augmented tool calls (long-running operations)',
    },
    completions: {
      '*': 'Server supports LLM completion requests',
    },
    logging: {
      '*': 'Server supports logging messages',
    },
    experimental: {
      '*': 'Server supports experimental features',
    },
  };

  return (
    explanations[capabilityName]?.[propertyName] ||
    explanations[capabilityName]?.['*'] ||
    ''
  );
}

/**
 * Display test results using Ink.
 */
export async function displayTestResults(
  options: TestResultsUIOptions
): Promise<void> {
  // Dynamically import React and Ink
  const importDynamic = new Function('specifier', 'return import(specifier)');

  const [ReactModule, inkModule] = await Promise.all([
    importDynamic('react'),
    importDynamic('ink'),
  ]);

  const React = ReactModule.default || ReactModule;
  const { Box, Text, render } = inkModule;

  const { result, transport } = options;

  // Get version info for display
  const currentVersion = getCurrentVersion();
  const versionInfo = await checkVersion('@ankan-ai/syrin');
  const versionDisplayString =
    versionInfo.isLatest || !versionInfo.latest
      ? `v${currentVersion} (latest)`
      : `v${currentVersion} (update available: v${versionInfo.latest}, run: syrin update)`;

  // Create the component
  const TestResultsComponent = (): React.ReactElement => {
    const details = result.details;
    const success = result.success;

    // Render capabilities section
    const renderCapabilities = (): React.ReactElement[] => {
      if (!details?.capabilities) {
        return [];
      }

      const capabilities = details.capabilities;
      const capabilityNames = Object.keys(capabilities).filter(key => {
        const value = capabilities[key];
        return value !== undefined && value !== null && value !== false;
      });

      if (capabilityNames.length === 0) {
        return [];
      }

      const elements: React.ReactElement[] = [];

      for (const capabilityName of capabilityNames) {
        const capability = capabilities[capabilityName];

        if (
          capability &&
          typeof capability === 'object' &&
          !Array.isArray(capability)
        ) {
          const capabilityObj = capability as Record<string, unknown>;
          const props = Object.keys(capabilityObj).filter(
            prop =>
              capabilityObj[prop] !== undefined &&
              capabilityObj[prop] !== null &&
              capabilityObj[prop] !== false
          );

          if (props.length > 0) {
            const propElements = props.map((prop): React.ReactElement => {
              const explanation = explainCapabilityProperty(
                capabilityName,
                prop
              );
              return React.createElement(
                Box,
                { key: prop, marginLeft: 4 },
                React.createElement(Text, {}, `  • ${prop}`),
                explanation
                  ? React.createElement(
                      Text,
                      { dimColor: true },
                      ` - ${explanation}`
                    )
                  : null
              ) as React.ReactElement;
            });
            elements.push(
              React.createElement(
                Box,
                { key: capabilityName, flexDirection: 'column', marginY: 0.5 },
                React.createElement(
                  Text,
                  { bold: true },
                  `  ${capabilityName}:`
                ),
                ...propElements
              ) as React.ReactElement
            );
          } else {
            elements.push(
              React.createElement(
                Box,
                { key: capabilityName, marginY: 0.5 },
                React.createElement(Text, {}, `  • ${capabilityName}`)
              ) as React.ReactElement
            );
          }
        } else {
          const explanation = explainCapabilityProperty(capabilityName, '*');
          elements.push(
            React.createElement(
              Box,
              { key: capabilityName, marginY: 0.5 },
              React.createElement(Text, {}, `  • ${capabilityName}`),
              explanation
                ? React.createElement(
                    Text,
                    { dimColor: true },
                    ` - ${explanation}`
                  )
                : null
            ) as React.ReactElement
          );
        }
      }

      return elements;
    };

    return React.createElement(
      Box,
      { flexDirection: 'column', paddingX: 1 },
      // Version display
      React.createElement(
        Box,
        { key: 'version', marginBottom: 1 },
        React.createElement(
          Text,
          { dimColor: true },
          `Syrin ${versionDisplayString}`
        )
      ),
      React.createElement(Box, { key: 'version-spacer', marginBottom: 1 }),
      // Header
      React.createElement(
        Box,
        { marginBottom: 1 },
        React.createElement(
          Text,
          { bold: true, color: success ? 'green' : 'red' },
          success ? '✓ Connection successful' : '✗ Connection failed'
        )
      ),

      // Error message if failed
      result.error
        ? React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(
              Text,
              { color: 'red' },
              `  Error: ${result.error}`
            )
          )
        : null,

      // Connection details
      details
        ? React.createElement(
            Box,
            { flexDirection: 'column', marginBottom: 1 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(Text, { bold: true }, '  Connection Details:')
            ),
            // URL or Command
            transport === 'http' && details.mcpUrl
              ? React.createElement(
                  Box,
                  { marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    '    MCP URL: '
                  ),
                  React.createElement(Text, {}, details.mcpUrl),
                  success
                    ? React.createElement(Text, { color: 'green' }, ' ✓')
                    : null
                )
              : transport === 'stdio' && details.command
                ? React.createElement(
                    Box,
                    { marginBottom: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '    Command: '
                    ),
                    React.createElement(Text, {}, details.command),
                    success
                      ? React.createElement(Text, { color: 'green' }, ' ✓')
                      : null
                  )
                : null,

            // Protocol version
            details.protocolVersion
              ? React.createElement(
                  Box,
                  { marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    '    Protocol Version: '
                  ),
                  React.createElement(Text, {}, details.protocolVersion)
                )
              : null,

            // Session ID
            details.sessionId
              ? React.createElement(
                  Box,
                  { marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    '    Session ID: '
                  ),
                  React.createElement(Text, {}, details.sessionId)
                )
              : null
          )
        : null,

      // Initialize Handshake details (only for HTTP transport and successful connections)
      details?.initializeRequest && success && transport === 'http'
        ? React.createElement(
            Box,
            { flexDirection: 'column', marginTop: 1, marginBottom: 1 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(
                Text,
                { bold: true },
                '  Initialize Handshake:'
              )
            ),
            React.createElement(
              Box,
              { marginLeft: 2, marginBottom: 0.5 },
              React.createElement(
                Text,
                { dimColor: true },
                '    Note: MCP uses Server-Sent Events (SSE) transport. Messages are sent via HTTP POST'
              )
            ),
            React.createElement(
              Box,
              { marginLeft: 2, marginBottom: 1 },
              React.createElement(
                Text,
                { dimColor: true },
                '    and responses are received via HTTP GET with text/event-stream.'
              )
            ),

            // Request details
            React.createElement(
              Box,
              { flexDirection: 'column', marginLeft: 2, marginBottom: 0.5 },
              React.createElement(
                Box,
                { marginBottom: 0.5 },
                React.createElement(Text, { bold: true }, '    Request:')
              ),
              details.initializeRequest.method
                ? React.createElement(
                    Box,
                    { marginLeft: 2, marginBottom: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '      HTTP Method: '
                    ),
                    React.createElement(
                      Text,
                      {},
                      details.initializeRequest.method
                    )
                  )
                : null,
              details.initializeRequest.url
                ? React.createElement(
                    Box,
                    { marginLeft: 2, marginBottom: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '      URL: '
                    ),
                    React.createElement(Text, {}, details.initializeRequest.url)
                  )
                : null,
              details.initializeRequest.headers &&
                Object.keys(details.initializeRequest.headers).length > 0
                ? React.createElement(
                    Box,
                    {
                      flexDirection: 'column',
                      marginLeft: 2,
                      marginBottom: 0.5,
                    },
                    React.createElement(
                      Box,
                      { marginBottom: 0.5 },
                      React.createElement(
                        Text,
                        { dimColor: true },
                        '      Headers:'
                      )
                    ),
                    ...Object.entries(details.initializeRequest.headers).map(
                      ([key, value]) =>
                        React.createElement(
                          Box,
                          { key, marginLeft: 4, marginBottom: 0.5 },
                          React.createElement(
                            Text,
                            { dimColor: true },
                            `        ${key}: `
                          ),
                          React.createElement(Text, {}, String(value))
                        ) as React.ReactElement
                    )
                  )
                : null,
              details.initializeRequest.body
                ? ((): React.ReactElement => {
                    const body = details.initializeRequest.body as {
                      method?: string;
                      params?: {
                        clientInfo?: { name?: string; version?: string };
                        protocolVersion?: string;
                      };
                    };
                    return React.createElement(
                      Box,
                      { flexDirection: 'column', marginLeft: 2 },
                      body.method
                        ? React.createElement(
                            Box,
                            { marginBottom: 0.5 },
                            React.createElement(
                              Text,
                              { dimColor: true },
                              '      JSON-RPC Method: '
                            ),
                            React.createElement(Text, {}, body.method)
                          )
                        : null,
                      body.params?.protocolVersion
                        ? React.createElement(
                            Box,
                            { marginBottom: 0.5 },
                            React.createElement(
                              Text,
                              { dimColor: true },
                              '      Protocol Version: '
                            ),
                            React.createElement(
                              Text,
                              {},
                              body.params.protocolVersion
                            )
                          )
                        : null,
                      body.params?.clientInfo
                        ? React.createElement(
                            Box,
                            { marginBottom: 0.5 },
                            React.createElement(
                              Text,
                              { dimColor: true },
                              '      Client Info: '
                            ),
                            React.createElement(
                              Text,
                              {},
                              `${body.params.clientInfo.name || ''} v${body.params.clientInfo.version || ''}`
                            )
                          )
                        : null
                    );
                  })()
                : null
            ),

            // Response details
            details.initializeResponse
              ? React.createElement(
                  Box,
                  { flexDirection: 'column', marginLeft: 2, marginTop: 0.5 },
                  React.createElement(
                    Box,
                    { marginBottom: 0.5 },
                    React.createElement(Text, { bold: true }, '    Response:')
                  ),
                  details.initializeResponse.statusCode
                    ? React.createElement(
                        Box,
                        { marginLeft: 2, marginBottom: 0.5 },
                        React.createElement(
                          Text,
                          { dimColor: true },
                          '      Status: '
                        ),
                        React.createElement(
                          Text,
                          {},
                          String(details.initializeResponse.statusCode)
                        )
                      )
                    : null,
                  details.initializeResponse.headers &&
                    Object.keys(details.initializeResponse.headers).length > 0
                    ? React.createElement(
                        Box,
                        {
                          flexDirection: 'column',
                          marginLeft: 2,
                          marginBottom: 0.5,
                        },
                        React.createElement(
                          Box,
                          { marginBottom: 0.5 },
                          React.createElement(
                            Text,
                            { dimColor: true },
                            '      Response Headers:'
                          )
                        ),
                        ...Object.entries(
                          details.initializeResponse.headers
                        ).map(
                          ([key, value]) =>
                            React.createElement(
                              Box,
                              { key, marginLeft: 4, marginBottom: 0.5 },
                              React.createElement(
                                Text,
                                { dimColor: true },
                                `        ${key}: `
                              ),
                              React.createElement(Text, {}, String(value))
                            ) as React.ReactElement
                        )
                      )
                    : null,
                  React.createElement(
                    Box,
                    { marginLeft: 2, marginTop: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '      Note: Server capabilities are returned in the initialize response'
                    )
                  )
                )
              : null
          )
        : null,

      // Capabilities
      details?.capabilities &&
        Object.keys(details.capabilities).filter(
          key =>
            details.capabilities?.[key] !== undefined &&
            details.capabilities?.[key] !== null &&
            details.capabilities?.[key] !== false
        ).length > 0
        ? React.createElement(
            Box,
            { flexDirection: 'column', marginTop: 1 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(
                Text,
                { bold: true },
                `  Server Capabilities (${
                  Object.keys(details.capabilities).filter(
                    key =>
                      details.capabilities?.[key] !== undefined &&
                      details.capabilities?.[key] !== null &&
                      details.capabilities?.[key] !== false
                  ).length
                }):`
              )
            ),
            React.createElement(
              Box,
              { marginLeft: 2, marginBottom: 0.5 },
              React.createElement(
                Text,
                { dimColor: true },
                'Note: Capabilities are obtained from the initialize response'
              )
            ),
            ...renderCapabilities()
          )
        : null
    );
  };

  // Render the component
  const instance = render(React.createElement(TestResultsComponent), {
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin,
    patchConsole: false, // Don't patch console, preserve existing output
  });

  // Wait a moment for the user to see the output, then exit
  await new Promise(resolve => setTimeout(resolve, 100));
  instance.unmount();
}
