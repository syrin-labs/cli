/**
 * Input panel component factory for Chat UI.
 * Creates an input panel component that works with dynamically imported React/Ink.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument
*/

import type { ChatUIOptions } from '../chat-ui-types';

/**
 * Creates an Input Panel component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
 * @param TextInput - TextInput component from ink-text-input
 * @param options - Chat UI options
 * @param input - Current input value
 * @param isProcessing - Whether the UI is processing
 * @param setInput - Function to update input value
 * @param handleSubmit - Function to handle form submission
 * @returns Input panel component element
 */
export function createInputPanel(
  React: {
    createElement: (
      type: unknown,
      props?: unknown,
      ...children: unknown[]
    ) => unknown;
  },
  Box: unknown,
  Text: unknown,
  TextInput: unknown,
  options: ChatUIOptions,
  input: string,
  isProcessing: boolean,
  setInput: (value: string) => void,
  handleSubmit: (value: string) => void
): unknown {
  const { createElement } = React;

  // Input area - fixed at bottom, modern minimal design with border and black background
  // flexShrink: 0 ensures it never shrinks, keeping it always visible at bottom
  return createElement(
    Box,
    {
      width: '100%',
      flexShrink: 0,
      flexGrow: 0,
      borderStyle: 'round',
      borderColor: 'gray',
      backgroundColor: 'black',
      paddingX: 1,
      paddingY: 1,
    },
    createElement(
      Box,
      {
        flexDirection: 'row',
        alignItems: 'center',
      },
      createElement(
        Text,
        { color: 'white', dimColor: true },
        `${options.agentName || 'You'} > `
      ),
      isProcessing
        ? createElement(
            Text,
            { color: 'white', dimColor: true },
            'Processing...'
          )
        : createElement(TextInput, {
            value: input,
            onChange: setInput,
            onSubmit: handleSubmit,
            placeholder: 'Type your message...',
          })
    )
  );
}
