/**
 * System message component factory for Chat UI.
 * Creates a system message component that works with dynamically imported React/Ink.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument
*/

import type { ChatMessage } from '../chat-ui-types';

/**
 * Creates a System Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param message - The chat message
 * @param index - Message index
 * @param markdownElements - Parsed markdown elements
 * @returns System message component element
 */
export function createSystemMessage(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  message: ChatMessage,
  index: number,
  markdownElements: unknown[]
): unknown {
  const { createElement } = React;

  // System messages: styled with bright yellow color to make them pop (no prefix)
  return createElement(
    Box,
    {
      key: index,
      flexDirection: 'column',
      marginY: 0.5,
    },
    createElement(
      Box,
      {
        flexDirection: 'column',
        paddingX: 1,
        paddingY: 0.5,
      },
      ...markdownElements
    )
  );
}
