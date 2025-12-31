/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument,
   @typescript-eslint/no-implied-eval
*/

import { checkVersion, getCurrentVersion } from '@/utils/version-checker';

/**
 * Presentation layer for list command UI components.
 * Provides minimalistic, easy-to-read displays for tools, resources, and prompts.
 */

interface ToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

interface ResourceInfo {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

interface PromptInfo {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Extract and format parameter information from a JSON schema.
 */
function extractParameters(
  schema: unknown
): Array<{ name: string; type: string; required: boolean }> {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const schemaObj = schema as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };

  if (!schemaObj.properties) {
    return [];
  }

  const required = new Set(schemaObj.required || []);
  const params: Array<{ name: string; type: string; required: boolean }> = [];

  for (const [name, prop] of Object.entries(schemaObj.properties)) {
    const propObj = prop as { type?: string; [key: string]: unknown };
    const type = propObj.type || 'unknown';
    params.push({
      name,
      type,
      required: required.has(name),
    });
  }

  return params;
}

/**
 * Display tools list using Ink.
 */
export function displayTools(tools: ToolInfo[]): void {
  const importDynamic = new Function('specifier', 'return import(specifier)');
  void (async (): Promise<void> => {
    const [ReactModule, inkModule] = await Promise.all([
      importDynamic('react'),
      importDynamic('ink'),
    ]);

    const React = ReactModule.default || ReactModule;
    const { Box, Text, render } = inkModule;

    // Get version info for display
    const currentVersion = getCurrentVersion();
    const versionInfo = await checkVersion('@ankan-ai/syrin');
    const versionDisplayString =
      versionInfo.isLatest || !versionInfo.latest
        ? `v${currentVersion} (latest)`
        : `v${currentVersion} (update available: v${versionInfo.latest}, run: syrin update)`;

    const ToolsComponent = (): React.ReactElement => {
      if (tools.length === 0) {
        return React.createElement(
          Box,
          { flexDirection: 'column', paddingX: 1 },
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(Text, { bold: true }, 'Tools:')
          ),
          React.createElement(
            Box,
            { marginLeft: 2 },
            React.createElement(
              Text,
              { dimColor: true },
              '  No tools available'
            )
          )
        );
      }

      const toolElements: React.ReactElement[] = [];

      for (const tool of tools) {
        const inputParams = extractParameters(tool.inputSchema);
        const outputParams = extractParameters(tool.outputSchema);

        // Tool header
        toolElements.push(
          React.createElement(
            Box,
            { key: tool.name, flexDirection: 'column', marginY: 1 },
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(
                Text,
                { color: 'green', bold: true },
                `  ✓ ${tool.name}`
              )
            ),

            // Description
            tool.description
              ? React.createElement(
                  Box,
                  { marginLeft: 4, marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    tool.description.split('\n')[0] // First line only
                  )
                )
              : null,

            // Input parameters summary
            inputParams.length > 0
              ? React.createElement(
                  Box,
                  { flexDirection: 'column', marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Box,
                    { marginBottom: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '  Parameters:'
                    )
                  ),
                  ...inputParams.map(
                    (param): React.ReactElement =>
                      React.createElement(
                        Box,
                        { key: param.name, marginLeft: 4, marginBottom: 0.25 },
                        React.createElement(
                          Text,
                          {},
                          `  • ${param.name} (${param.type})${param.required ? ' - required' : ''}`
                        )
                      )
                  )
                )
              : React.createElement(
                  Box,
                  { marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    '  No parameters'
                  )
                ),

            // Output summary
            outputParams.length > 0
              ? React.createElement(
                  Box,
                  { flexDirection: 'column', marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Box,
                    { marginBottom: 0.5 },
                    React.createElement(Text, { dimColor: true }, '  Returns:')
                  ),
                  React.createElement(
                    Box,
                    { marginLeft: 4 },
                    React.createElement(
                      Text,
                      {},
                      `  ${outputParams.length} ${outputParams.length === 1 ? 'property' : 'properties'}`
                    )
                  )
                )
              : null
          )
        );
      }

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
        React.createElement(
          Box,
          { marginBottom: 1 },
          React.createElement(Text, { bold: true }, 'Tools:'),
          React.createElement(
            Text,
            { dimColor: true },
            ` ${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`
          )
        ),
        ...toolElements
      );
    };

    const instance = render(React.createElement(ToolsComponent), {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      patchConsole: false,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    instance.unmount();
  })();
}

/**
 * Display resources list using Ink.
 */
export function displayResources(resources: ResourceInfo[]): void {
  const importDynamic = new Function('specifier', 'return import(specifier)');
  void (async (): Promise<void> => {
    const [ReactModule, inkModule] = await Promise.all([
      importDynamic('react'),
      importDynamic('ink'),
    ]);

    const React = ReactModule.default || ReactModule;
    const { Box, Text, render } = inkModule;

    // Get version info for display
    const currentVersion = getCurrentVersion();
    const versionInfo = await checkVersion('@ankan-ai/syrin');
    const versionDisplayString =
      versionInfo.isLatest || !versionInfo.latest
        ? `v${currentVersion} (latest)`
        : `v${currentVersion} (update available: v${versionInfo.latest}, run: syrin update)`;

    const ResourcesComponent = (): React.ReactElement => {
      if (resources.length === 0) {
        return React.createElement(
          Box,
          { flexDirection: 'column', paddingX: 1 },
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(Text, { bold: true }, 'Resources:')
          ),
          React.createElement(
            Box,
            { marginLeft: 2 },
            React.createElement(
              Text,
              { dimColor: true },
              '  No resources available'
            )
          )
        );
      }

      const resourceElements: React.ReactElement[] = [];

      for (const resource of resources) {
        resourceElements.push(
          React.createElement(
            Box,
            {
              key: resource.uri,
              flexDirection: 'column',
              marginY: 1,
            } as unknown as Record<string, unknown>,
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(
                Text,
                { color: 'green', bold: true },
                `  ✓ ${resource.uri}`
              )
            ),
            resource.name
              ? React.createElement(
                  Box,
                  { marginLeft: 4, marginBottom: 0.5 },
                  React.createElement(Text, { dimColor: true }, '  Name: '),
                  React.createElement(Text, {}, resource.name)
                )
              : null,
            resource.description
              ? React.createElement(
                  Box,
                  { marginLeft: 4, marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    resource.description.split('\n')[0] // First line only
                  )
                )
              : null,
            resource.mimeType
              ? React.createElement(
                  Box,
                  { marginLeft: 4 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    `  Type: ${resource.mimeType}`
                  )
                )
              : null
          )
        );
      }

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
        React.createElement(
          Box,
          { marginBottom: 1 },
          React.createElement(Text, { bold: true }, 'Resources:'),
          React.createElement(
            Text,
            { dimColor: true },
            ` ${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`
          )
        ),
        ...resourceElements
      );
    };

    const instance = render(React.createElement(ResourcesComponent), {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      patchConsole: false,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    instance.unmount();
  })();
}

/**
 * Display prompts list using Ink.
 */
export function displayPrompts(prompts: PromptInfo[]): void {
  const importDynamic = new Function('specifier', 'return import(specifier)');
  void (async (): Promise<void> => {
    const [ReactModule, inkModule] = await Promise.all([
      importDynamic('react'),
      importDynamic('ink'),
    ]);

    const React = ReactModule.default || ReactModule;
    const { Box, Text, render } = inkModule;

    // Get version info for display
    const currentVersion = getCurrentVersion();
    const versionInfo = await checkVersion('@ankan-ai/syrin');
    const versionDisplayString =
      versionInfo.isLatest || !versionInfo.latest
        ? `v${currentVersion} (latest)`
        : `v${currentVersion} (update available: v${versionInfo.latest}, run: syrin update)`;

    const PromptsComponent = (): React.ReactElement => {
      if (prompts.length === 0) {
        return React.createElement(
          Box,
          { flexDirection: 'column', paddingX: 1 },
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(Text, { bold: true }, 'Prompts:')
          ),
          React.createElement(
            Box,
            { marginLeft: 2 },
            React.createElement(
              Text,
              { dimColor: true },
              '  No prompts available'
            )
          )
        );
      }

      const promptElements: React.ReactElement[] = [];

      for (const prompt of prompts) {
        promptElements.push(
          React.createElement(
            Box,
            {
              key: prompt.name,
              flexDirection: 'column',
              marginY: 1,
            } as unknown as Record<string, unknown>,
            React.createElement(
              Box,
              { marginBottom: 0.5 },
              React.createElement(
                Text,
                { color: 'green', bold: true },
                `  ✓ ${prompt.name}`
              )
            ),
            prompt.description
              ? React.createElement(
                  Box,
                  { marginLeft: 4, marginBottom: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    prompt.description.split('\n')[0] // First line only
                  )
                )
              : null,
            prompt.arguments && prompt.arguments.length > 0
              ? React.createElement(
                  Box,
                  { flexDirection: 'column', marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Box,
                    { marginBottom: 0.5 },
                    React.createElement(
                      Text,
                      { dimColor: true },
                      '  Arguments:'
                    )
                  ),
                  ...prompt.arguments.map(
                    arg =>
                      React.createElement(
                        Box,
                        { key: arg.name, marginLeft: 4, marginBottom: 0.25 },
                        React.createElement(
                          Text,
                          {},
                          `  • ${arg.name}${arg.required ? ' (required)' : ''}`
                        ),
                        arg.description
                          ? React.createElement(
                              Box,
                              { marginLeft: 2, marginTop: 0.25 },
                              React.createElement(
                                Text,
                                { dimColor: true },
                                `  ${arg.description.split('\n')[0]}`
                              )
                            )
                          : null
                      ) as React.ReactElement
                  )
                )
              : React.createElement(
                  Box,
                  { marginLeft: 4, marginTop: 0.5 },
                  React.createElement(
                    Text,
                    { dimColor: true },
                    '  No arguments'
                  )
                )
          )
        );
      }

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
        React.createElement(
          Box,
          { marginBottom: 1 },
          React.createElement(Text, { bold: true }, 'Prompts:'),
          React.createElement(
            Text,
            { dimColor: true },
            ` ${prompts.length} ${prompts.length === 1 ? 'prompt' : 'prompts'}`
          )
        ),
        ...promptElements
      );
    };

    const instance = render(React.createElement(PromptsComponent), {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      patchConsole: false,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    instance.unmount();
  })();
}
