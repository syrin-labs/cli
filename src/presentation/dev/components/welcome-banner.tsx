/**
 * Welcome banner component factory for Chat UI.
 * Creates a persistent welcome banner that displays Syrin branding and info.
 */

export interface WelcomeBannerOptions {
  versionDisplay: string; // Formatted version string from formatVersionWithUpdate
  llmProvider: string;
  toolCount: number;
  transport: string;
  mcpUrl?: string;
  command?: string;
}

/**
 * Creates a Welcome Banner component factory function.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param options - Welcome banner options
 * @returns Welcome banner component element
 */
export function createWelcomeBanner(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  options: WelcomeBannerOptions
): unknown {
  const { createElement } = React;

  // ASCII art for "Syrin" - gradient style (similar to speed version)
  // Using gradient colors from cyan -> blue -> magenta for visual effect
  // Properly formatted ASCII art for "Syrin"
  const syrinAscii = [
    '________              _____',
    '__  ___/____  ___________(_)______',
    '_____ \\__  / / /_  ___/_  /__  __ \\',
    '____/ /_  /_/ /_  /   _  / _  / / /',
    '/____/ _\\__, / /_/    /_/  /_/ /_/',
    '       /____/',
  ];

  // Version display - already formatted by formatVersionWithUpdate in dev.ts
  const versionDisplay = options.versionDisplay;

  // Links
  const npmLink = 'https://www.npmjs.com/package/@ankan-ai/syrin';
  const githubLink = 'https://github.com/ankan-labs/syrin';
  const docsLink = githubLink + '#readme';

  return createElement(
    Box,
    {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    // Centered container with max width
    createElement(
      Box,
      {
        width: '70%',
        maxWidth: 90,
        borderStyle: 'single',
        borderColor: 'cyan',
        paddingX: 1,
        paddingY: 1,
      },
      // Outer container
      createElement(
        Box,
        {
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        },
        // ASCII art title - left aligned text in a centered container
        createElement(
          Box,
          {
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 1,
            width: '100%',
          },
          createElement(
            Box,
            {
              flexDirection: 'column',
              alignItems: 'flex-start',
            },
            ...syrinAscii.map((line, index) => {
              // Gradient effect: cyan -> blue -> magenta -> cyan -> blue -> magenta
              const gradientColors = [
                'cyan',
                'blue',
                'magenta',
                'cyan',
                'blue',
                'magenta',
              ];
              const color =
                gradientColors[index % gradientColors.length] || 'cyan';
              // Trim the line to remove any trailing spaces that could cause alignment issues
              const trimmedLine = line.trimEnd();
              return createElement(
                Text,
                {
                  key: index,
                  color,
                  bold: true,
                },
                trimmedLine
              );
            })
          )
        ),
        // Version
        createElement(
          Box,
          {
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 1,
          },
          createElement(Text, { color: 'white', bold: true }, versionDisplay)
        ),
        // Details section - centered container with left-aligned content
        createElement(
          Box,
          {
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 1,
            width: '100%',
          },
          createElement(
            Box,
            {
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
              minWidth: 0,
              paddingX: 0,
              paddingRight: 1,
            },
            // Transport info
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '📦 Transport:   '),
              createElement(
                Text,
                { color: 'white' },
                options.transport.toUpperCase()
              )
            ),
            // MCP URL or command
            options.mcpUrl
              ? createElement(
                  Box,
                  {
                    flexDirection: 'row',
                    marginBottom: 0.5,
                    width: '100%',
                  },
                  createElement(Text, { color: 'yellow' }, '🔗 Server URL:  '),
                  createElement(Text, { color: 'white' }, options.mcpUrl)
                )
              : options.command
                ? createElement(
                    Box,
                    {
                      flexDirection: 'row',
                      marginBottom: 0.5,
                      width: '100%',
                    },
                    createElement(
                      Text,
                      { color: 'yellow' },
                      '⚙️  Command:     '
                    ),
                    createElement(Text, { color: 'white' }, options.command)
                  )
                : null,
            // LLM and Tools info
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '🤖 LLM:         '),
              createElement(Text, { color: 'white' }, options.llmProvider)
            ),
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '🔨 Tools:       '),
              createElement(
                Text,
                { color: 'white' },
                options.toolCount.toString()
              ),
              createElement(
                Text,
                { color: 'yellow', dimColor: true },
                ' (/tools to see)'
              )
            ),
            // Links
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginTop: 1,
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '📚 Docs:        '),
              createElement(Text, { color: 'cyan' }, docsLink)
            ),
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '📦 NPM:         '),
              createElement(Text, { color: 'cyan' }, npmLink)
            ),
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginBottom: 0.5,
                width: '100%',
              },
              createElement(Text, { color: 'yellow' }, '🐙 GitHub:      '),
              createElement(Text, { color: 'cyan' }, githubLink)
            ),
            // Help message
            createElement(
              Box,
              {
                flexDirection: 'row',
                marginTop: 1,
                marginBottom: 0.5,
                width: '100%',
                justifyContent: 'center',
              },
              createElement(
                Text,
                { color: 'yellow', dimColor: true },
                '💡 Send /help command to find out chat commands and how to use them'
              )
            )
          )
        )
      )
    )
  );
}
