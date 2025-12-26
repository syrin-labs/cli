/**
 * Types for MCP connections.
 * These types represent the structure of MCP connection results and connection information.
 */

import type { MCPURL, Command } from '@/types/ids';
import type { TransportType } from '@/config/types';

/**
 * Result of connecting to an MCP server.
 */
export interface MCPConnectionResult {
  /** Whether the connection was successful */
  success: boolean;
  /** Transport type used */
  transport: TransportType;
  /** Error message if connection failed */
  error?: string;
  /** Connection details */
  details?: MCPConnectionDetails;
}

/**
 * Request/response information for debugging.
 */
export interface MCPRequestInfo {
  /** HTTP method used */
  method?: string;
  /** URL endpoint */
  url?: string;
  /** Headers sent */
  headers?: Record<string, string>;
  /** Request body/payload */
  body?: unknown;
}

export interface MCPResponseInfo {
  /** HTTP status code */
  statusCode?: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response body */
  body?: unknown;
}

/**
 * Detailed information about an MCP connection.
 */
export interface MCPConnectionDetails {
  /** The MCP URL */
  mcpUrl: string;
  /** Discovery URL (if applicable) */
  discoveryUrl?: string;
  /** Protocol version (if available) */
  protocolVersion?: string;
  /** Server capabilities (if available) - keys are capability names */
  capabilities?: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Client instance (for reuse in other commands) */
  client?: unknown;
  /** Transport instance (for reuse in other commands) */
  transport?: unknown;
  /** Initialize request information */
  initializeRequest?: MCPRequestInfo;
  /** Initialize response information */
  initializeResponse?: MCPResponseInfo;
  /** Session ID if available */
  sessionId?: string;
}

/**
 * Options for connecting to an MCP server.
 */
export interface MCPConnectionOptions {
  /** Transport type to use */
  transport: TransportType;
  /** MCP URL (for http transport) */
  url?: MCPURL | string;
  /** Command to execute (for stdio transport) */
  command?: Command | string;
  /** Timeout in milliseconds */
  timeout?: number;
}
