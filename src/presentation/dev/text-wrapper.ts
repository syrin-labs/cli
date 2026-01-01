/**
 * Text wrapping utility for user messages.
 */

/**
 * Wrap text to fit within a specified width.
 *
 * This function guarantees at least one line in the result. When the input is empty
 * or contains only whitespace, it returns `['']` (a single empty string) rather than an empty array.
 * This behavior ensures consistent handling in UI components that expect at least one line
 * to render, preventing layout issues when displaying wrapped text.
 *
 * @param text - The text to wrap
 * @param width - Maximum width per line
 * @returns Array of wrapped lines. Always contains at least one element; returns `['']` for empty or whitespace-only input.
 *
 * @example
 * // Normal text wrapping
 * wrapText('Hello world', 5) // Returns ['Hello', 'world']
 *
 * @example
 * // Empty input returns single empty line
 * wrapText('', 10) // Returns ['']
 * wrapText('   ', 10) // Returns [''] (whitespace-only)
 *
 * @example
 * // Long words are split across lines
 * wrapText('supercalifragilistic', 5) // Returns ['super', 'calif', 'ragil', 'istic']
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // Skip empty tokens
    if (word === '') {
      continue;
    }

    // Handle words longer than width
    if (word.length > width) {
      // Push current line if non-empty before inserting chunks
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Split word into chunks of size <= width
      for (let i = 0; i < word.length; i += width) {
        const chunk = word.substring(i, i + width);
        if (chunk.length === width) {
          // Full chunk - append as its own line
          lines.push(chunk);
        } else {
          // Remaining partial chunk - start new currentLine
          currentLine = chunk;
        }
      }
    } else {
      // Normal word handling
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}
