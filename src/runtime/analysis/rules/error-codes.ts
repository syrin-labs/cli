/**
 * Error code constants.
 * Centralized definition of all error codes used in the analysis system.
 * Organized by category (similar to HTTP status codes) for future expansion.
 * This ensures type safety, prevents typos, and provides a single source of truth.
 */

/**
 * Error codes for analysis rules.
 * Organized in categories with ranges for future expansion.
 */
export const ERROR_CODES = {
  // 0xx: Configuration & Setup Errors
  E000: 'E000', // Tool Not Found

  // 1xx: Schema & Contract Errors (Static Analysis)
  E100: 'E100', // Missing Output Schema
  E101: 'E101', // Missing Tool Description
  E102: 'E102', // Underspecified Required Input
  E103: 'E103', // Type Mismatch
  E104: 'E104', // Parameter Not In Description
  E105: 'E105', // Free Text Propagation
  E106: 'E106', // Output Not Guaranteed
  E107: 'E107', // Circular Dependency
  E108: 'E108', // Implicit User Input
  E109: 'E109', // Non-Serializable
  E110: 'E110', // Tool Ambiguity

  // 2xx: Input Validation Errors
  E200: 'E200', // Input Validation Failed

  // 3xx: Output Validation Errors
  E300: 'E300', // Output Validation Failed
  E301: 'E301', // Output Explosion

  // 4xx: Execution Errors
  E400: 'E400', // Tool Execution Failed
  E403: 'E403', // Unbounded Execution

  // 5xx: Behavioral Errors (Side Effects & Dependencies)
  E500: 'E500', // Side Effect Detected
  E501: 'E501', // Hidden Dependency

  // 6xx: Test & Validation Framework Errors
  E600: 'E600', // Unexpected Test Result
} as const;

/**
 * Warning code constants.
 */
export const WARNING_CODES = {
  // 1xx: Schema & Contract Warnings (Static Analysis)
  W100: 'W100', // Implicit Dependency
  W101: 'W101', // Free Text Without Normalization
  W102: 'W102', // Missing Examples
  W103: 'W103', // Overloaded Responsibility
  W104: 'W104', // Generic Description
  W105: 'W105', // Optional As Required
  W106: 'W106', // Broad Output Schema
  W107: 'W107', // Multiple Entry Points
  W108: 'W108', // Hidden Side Effects
  W109: 'W109', // Output Not Reusable
  W110: 'W110', // Weak Schema

  // 3xx: Output Validation Warnings
  W300: 'W300', // High Entropy Output
  W301: 'W301', // Unstable Defaults
} as const;

/**
 * Error code type for type safety.
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Warning code type for type safety.
 */
export type WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];

/**
 * Error type to error code mapping.
 * Maps friendly error type names (as used in test expectations) to error codes.
 */
export const ERROR_TYPE_TO_CODE: Record<string, ErrorCode> = {
  side_effect: ERROR_CODES.E500,
  output_explosion: ERROR_CODES.E301,
  hidden_dependency: ERROR_CODES.E501,
  unbounded_execution: ERROR_CODES.E403,
  output_validation: ERROR_CODES.E300,
  input_validation: ERROR_CODES.E200,
  execution_error: ERROR_CODES.E400,
} as const;
