/**
 * Payload interfaces for Tool Execution Events (Ground Truth)
 */

export interface ToolExecutionStartedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  execution_id: string;
}

export interface ToolExecutionCompletedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  execution_id: string;
  duration_ms: number;
}

export interface ToolExecutionFailedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  execution_id: string;
  error: ToolExecutionError;
  duration_ms: number;
}

export interface ToolExecutionError {
  message: string;
  code: string;
  stack_trace?: string;
  error_type: 'validation' | 'runtime' | 'timeout' | 'permission' | 'unknown';
}
