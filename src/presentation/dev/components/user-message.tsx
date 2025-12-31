/**
 * User message component factory for Chat UI.
 * Creates a user message component that works with dynamically imported React/Ink.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument
*/

import type { ChatMessage, ChatUIOptions } from '../chat-ui-types';

/**
 * Creates a User Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param message - The chat message
 * @param index - Message index
 * @param options - Chat UI options
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
  message: ChatMessage,
  index: number,
  options: ChatUIOptions,
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
          timestamp + line
        )
      )
    )
  );
}
