/**
 * Transport type constants.
 */

export const TransportTypes = {
  HTTP: 'http',
  STDIO: 'stdio',
} as const;

export type TransportType =
  (typeof TransportTypes)[keyof typeof TransportTypes];
