/**
 * Contract type definitions for tool unit contracts.
 * These types represent the structure of tool contract YAML files.
 */

/**
 * Tool unit contract version.
 * Currently only version 1 is supported.
 */
export type ContractVersion = 1;

/**
 * Guarantees that a tool must satisfy.
 */
export interface ContractGuarantees {
  /** Whether the tool produces deterministic output (same input → same output) */
  deterministic?: boolean;
  /** Side effects allowed: 'none' means no side effects, 'filesystem' allows temp dir writes */
  side_effects?: 'none' | 'filesystem';
  /** Maximum output size in bytes (e.g., '50kb', '1mb') */
  max_output_size?: string;
  /** Maximum execution time (e.g., '30s', '5m', '2h'). If not specified, uses global default timeout */
  max_execution_time?: string;
}

/**
 * Error expectation details for test cases.
 */
export interface ErrorExpectationDetails {
  /** Pydantic error type (e.g., 'missing_argument', 'string_type') */
  error_type?: string;
  /** Field name that caused the error */
  field?: string;
  /** Expected type/value */
  expected?: string;
  /** Actual type/value received */
  received?: string;
  /** Error message pattern to match */
  message?: string;
  /** Additional error details (flexible for different error types) */
  [key: string]: unknown;
}

/**
 * Error expectation for test cases.
 */
export interface ErrorExpectation {
  /** Error code (optional - for backward compatibility, but not required) */
  code?: string;
  /** Error category (e.g., 'input_validation', 'execution_error', 'output_validation', 'side_effect', 'output_explosion', 'unbounded_execution') */
  type?: string;
  /** Detailed error information */
  details?: ErrorExpectationDetails;
}

/**
 * Expected test outcome.
 */
export interface TestExpectation {
  /** Whether test should succeed (default: true if no error specified) */
  success?: boolean;
  /** Output schema name (optional, inherits from contract.output_schema) */
  output_schema?: string;
  /** Error expectation (if test is expected to fail) */
  error?: ErrorExpectation;
}

/**
 * Test case for a tool.
 */
export interface ContractTest {
  /** Test case name */
  name: string;
  /** Test input values */
  input: Record<string, unknown>;
  /** Expected test outcome */
  expect?: TestExpectation;
  /** Environment variables for this test (optional) */
  env?: Record<string, string>;
}

/**
 * Tool unit contract structure.
 */
export interface ToolContract {
  /** Contract version (must be 1 for v1.3.0) */
  version: ContractVersion;
  /** Tool name (must match MCP tool name) */
  tool: string;
  /** Contract specifications */
  contract: {
    /** Input schema name (references MCP tool's input schema) */
    input_schema: string;
    /** Output schema name (references MCP tool's output schema) */
    output_schema: string;
  };
  /** Behavioral guarantees */
  guarantees: ContractGuarantees;
  /** Test cases */
  tests?: ContractTest[];
}

/**
 * Parsed contract file with metadata.
 */
export interface ParsedContract extends ToolContract {
  /** Path to the contract file */
  filePath: string;
  /** Directory containing the contract file */
  directory: string;
  /** Filename without extension */
  toolName: string;
}
