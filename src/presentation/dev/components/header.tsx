/**
 * Header component factory for Chat UI.
 * Creates a header component that works with dynamically imported React/Ink.
 */

/* eslint-disable
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-unsafe-argument
*/

/**
 * Creates a Header component factory function.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
 * @param Text - Text component from Ink
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
  Text: unknown
): unknown {
  const { createElement } = React;

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
      ' Syrin Dev Mode '
    ),
    createElement(
      Text,
      { color: 'white', dimColor: true },
      '| Enter /exit or /quit to exit'
    )
  );
}
