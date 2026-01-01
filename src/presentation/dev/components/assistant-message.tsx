/**
 * Assistant message component factory for Chat UI.
 * Creates an assistant message component that works with dynamically imported React/Ink.
 */

import type { ChatUIOptions } from '../chat-ui-types';

/**
 * Creates an Assistant Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
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
        marginBottom: 0,
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
        paddingY: 1,
        marginLeft: 1,
      },
      ...markdownElements
    )
  );
}
