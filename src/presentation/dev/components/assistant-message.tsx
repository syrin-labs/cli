/**
 * Assistant message component factory for Chat UI.
 * Creates an assistant message component that works with dynamically imported React/Ink.
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
 * Creates an Assistant Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param message - The chat message
 * @param index - Message index
 * @param options - Chat UI options
 * @param markdownElements - Parsed markdown elements
 * @returns Assistant message component element
 */
export function createAssistantMessage(
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
  markdownElements: unknown[]
): unknown {
  const { createElement } = React;

  // LLM-generated messages: minimalistic bordered rectangle style
  return createElement(
    Box,
    {
      key: index,
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginY: 1,
    },
    createElement(
      Box,
      {
        flexDirection: 'row',
        marginBottom: 0.25,
        marginLeft: 1,
      },
      createElement(
        Text,
        { color: 'cyan', bold: true },
        `🤖 ${options.llmProviderName || 'AI'}: `
      )
    ),
    createElement(
      Box,
      {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: 'gray',
        paddingX: 1,
        paddingY: 0.5,
        marginLeft: 1,
      },
      ...markdownElements
    )
  );
}
