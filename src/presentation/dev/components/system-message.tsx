/**
 * System message component factory for Chat UI.
 * Creates a system message component that works with dynamically imported React/Ink.
 */

/**
 * Creates a System Message component element.
 * @param React - React module (dynamically imported)
 * @param Box - Box component from Ink
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
  index: number,
  markdownElements: unknown[]
): unknown {
  const { createElement } = React;

  // System messages: no prefix; color is applied by parseMarkdown in message-component.tsx
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
