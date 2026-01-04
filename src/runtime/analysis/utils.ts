/**
 * Shared utility functions for analysis rules.
 */

/**
 * Escape regex metacharacters in a string to use it as a literal pattern.
 * This prevents ReDoS attacks and regex injection vulnerabilities.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp constructor
 *
 * @example
 * ```ts
 * const keyword = "user.id";
 * const escaped = escapeRegex(keyword); // "user\\.id"
 * const regex = new RegExp(`\\b${escaped}\\b`, 'i');
 * ```
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
