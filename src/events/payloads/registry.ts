/**
 * Payload interfaces for Tool Registry & Discovery Events
 */

export interface ToolRegistryLoadedPayload {
  tool_count: number;
  source: 'mcp_server' | 'config' | 'adapter';
}

export interface ToolRegisteredPayload {
  tool_name: string;
  tool_schema: ToolSchema;
  source: 'mcp_server' | 'config' | 'adapter';
}

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolRegistrationFailedPayload {
  tool_name: string;
  failure_reason: string;
  error_code: string;
}

export interface ToolAvailabilityCheckedPayload {
  tool_name: string;
  available: boolean;
  reason?: string;
}
