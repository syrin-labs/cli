/**
 * Header component factory for Chat UI.
 * Creates a header component that works with dynamically imported React/Ink.
 */

import type { ChatUIOptions } from '../chat-ui-types';

/**
 * Creates a Header component factory function.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param options - Chat UI options
 * @returns Header component element
 */
export function createHeader(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  options: ChatUIOptions
): unknown {
  const { createElement } = React;
  const agentName = options.agentName || 'Syrin';

  return createElement(
    Box,
    {
      width: '100%',
      borderStyle: 'single',
      borderColor: 'blue',
    },
    createElement(
      Text,
      { color: 'white', bold: true },
      ` ${agentName} Dev Mode `
    ),
    createElement(
      Text,
      { color: 'white', dimColor: true },
      '| Enter /exit or /quit to exit'
    )
  );
}
