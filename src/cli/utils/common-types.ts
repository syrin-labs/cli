/**
 * Common types and interfaces shared across CLI commands.
 * This centralizes common option interfaces to avoid duplication.
 */

import type { TransportType } from '@/config/types';

/**
 * Common transport-related options used by multiple commands.
 * Commands that need transport configuration should extend this interface.
 */
export interface TransportCommandOptions {
  /** Transport type override */
  transport?: TransportType;
  /** MCP server URL (for HTTP transport) */
  url?: string;
  /** Command/script to run (for stdio transport) */
  script?: string;
  /** Project root directory */
  projectRoot?: string;
  /** Environment variables to pass to MCP server (for stdio transport) */
  env?: Record<string, string>;
  /** Authentication headers (for HTTP transport) */
  authHeaders?: Record<string, string>;
}
