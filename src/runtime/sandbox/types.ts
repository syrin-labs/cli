/**
 * Sandbox types and interfaces.
 * Shared types for sandbox execution functionality.
 */

/**
 * Error types for tool execution.
 */
export enum ToolExecutionErrorType {
  /** Input validation error (e.g., wrong type, missing required field) */
  INPUT_VALIDATION = 'INPUT_VALIDATION',
  /** Output validation error (output doesn't match schema) */
  OUTPUT_VALIDATION = 'OUTPUT_VALIDATION',
  /** Tool execution error (runtime error in tool) */
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  /** Timeout error */
  TIMEOUT = 'TIMEOUT',
  /** Network/connection error */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Enhanced error with classification.
 */
export interface ToolExecutionError extends Error {
  /** Error type classification */
  errorType: ToolExecutionErrorType;
  /** Original error code from MCP (if available) */
  errorCode?: number;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Result of a single tool execution.
 * Discriminated union: successful executions have output, failed executions have error.
 */
export type ToolExecutionResult =
  | {
      /** Discriminator: true for successful executions */
      success: true;
      /** Tool output */
      output: unknown;
      /** Execution time in milliseconds */
      executionTime: number;
      /** Memory used in MB (if available) */
      memoryUsed?: number;
    }
  | {
      /** Discriminator: false for failed executions */
      success: false;
      /** Error that occurred during execution */
      error: ToolExecutionError;
      /** Execution time in milliseconds */
      executionTime: number;
      /** Memory used in MB (if available) */
      memoryUsed?: number;
      /** Whether execution timed out */
      timedOut?: boolean;
    };
