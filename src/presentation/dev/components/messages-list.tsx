/**
 * Messages list component factory for Chat UI.
 * Creates a messages list component that works with dynamically imported React/Ink.
 */

import type { ChatMessage, ChatUIOptions } from '../chat-ui-types';

/**
 * Creates a Messages List component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param messages - Array of chat messages
 * @param maxVisibleMessages - Maximum number of messages to display
 * @param MessageComponent - The memoized message component to use
 * @param options - Chat UI options
 * @returns Messages list component element
 */
export function createMessagesList(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  messages: ChatMessage[],
  maxVisibleMessages: number,
  MessageComponent: (props: {
    message: ChatMessage;
    index: number;
    options: ChatUIOptions;
  }) => unknown,
  options: ChatUIOptions
): unknown {
  const { createElement } = React;

  // Determine which messages to show (always show last N messages)
  const visibleMessages = messages.slice(-maxVisibleMessages);
  const hiddenCount = messages.length - visibleMessages.length;
  const startIndex = Math.max(0, messages.length - maxVisibleMessages);

  return createElement(
    Box,
    {
      flexDirection: 'column',
      flexGrow: 1,
      flexShrink: 1,
      paddingX: 1,
      minHeight: 0, // Allow shrinking below content size
    },
    // Show message if there are hidden messages
    hiddenCount > 0
      ? createElement(
          Box,
          {
            key: 'viewport-info',
            marginY: 0.5,
            paddingX: 1,
          },
          createElement(
            Text,
            { color: 'yellow', dimColor: true },
            `... ${hiddenCount} earlier message${hiddenCount > 1 ? 's' : ''} hidden (showing last ${maxVisibleMessages} messages).`
          )
        )
      : null,
    // Render visible messages
    ...visibleMessages.map((message: ChatMessage, localIndex: number) => {
      const globalIndex = startIndex + localIndex;
      return createElement(MessageComponent, {
        key: `${message.role}-${globalIndex}`,
        message,
        index: globalIndex,
        options,
      });
    })
  );
}
