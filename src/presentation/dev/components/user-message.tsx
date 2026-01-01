/**
 * User message component factory for Chat UI.
 * Creates a user message component that works with dynamically imported React/Ink.
 */

import type { ChatMessage, ChatUIOptions } from '../chat-ui-types';

/**
 * Creates a User Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param _message - The chat message (unused but required for interface compatibility)
 * @param index - Message index
 * @param _options - Chat UI options (unused but required for interface compatibility)
 * @param timestamp - Formatted timestamp string
 * @param wrappedLines - Wrapped text lines
 * @returns User message component element
 */
export function createUserMessage(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  _message: ChatMessage,
  index: number,
  _options: ChatUIOptions,
  timestamp: string,
  wrappedLines: string[]
): unknown {
  const { createElement } = React;

  // User messages: minimalistic bordered rectangle with blue background
  return createElement(
    Box,
    {
      key: index,
      flexDirection: 'column',
      alignItems: 'flex-end',
      marginY: 1,
    },
    createElement(
      Box,
      {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: 'blue',
        backgroundColor: 'blue',
        paddingX: 1,
        paddingY: 0.1,
        marginRight: 1,
      },
      ...wrappedLines.map((line: string, lineIndex: number) =>
        createElement(
          Text,
          { key: lineIndex, color: 'white' },
          lineIndex === 0 ? timestamp + line : line
        )
      )
    )
  );
}
