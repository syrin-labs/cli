/**
 * Type definitions for the analysis engine.
 * Core types for static analysis of MCP tool contracts.
 */

/**
 * Raw tool data from MCP server (before normalization).
 */
export interface RawTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

/**
 * Field specification extracted from JSON Schema.
 */
export interface FieldSpec {
  /** Tool name this field belongs to */
  tool: string;
  /** Field name */
  name: string;
  /** JSON Schema type (string, number, object, array, etc.) */
  type: string;
  /** Whether this field is required */
  required: boolean;
  /** Field description */
  description?: string;
  /** Enum values if applicable */
  enum?: string[];
  /** Regex pattern if applicable */
  pattern?: string;
  /** Format specifier if applicable (email, uri, date-time, etc.) */
  format?: string;
  /** Example value if provided */
  example?: unknown;
  /** Whether field is nullable */
  nullable?: boolean;
  /** Nested properties for object types */
  properties?: FieldSpec[];
}

/**
 * Normalized tool specification.
 */
export interface ToolSpec {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input fields */
  inputs: FieldSpec[];
  /** Output fields */
  outputs: FieldSpec[];
  /** Extracted tokens from description (for similarity matching) */
  descriptionTokens: Set<string>;
  /** Pre-computed semantic embedding for description (384-dim vector) */
  descriptionEmbedding?: number[];
  /** Pre-computed embeddings for input fields */
  inputEmbeddings?: Map<string, number[]>;
  /** Pre-computed embeddings for output fields */
  outputEmbeddings?: Map<string, number[]>;
}

/**
 * Inferred dependency between tools.
 */
export interface Dependency {
  /** Source tool name */
  fromTool: string;
  /** Source field name */
  fromField: string;
  /** Target tool name */
  toTool: string;
  /** Target field name */
  toField: string;
  /** Confidence score (0.0-1.0) */
  confidence: number;
}

/**
 * Analysis diagnostic (error or warning).
 */
export interface Diagnostic {
  /** Diagnostic code (E001-E010 for errors, W001-W010 for warnings) */
  code: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Human-readable message */
  message: string;
  /** Tool name (if applicable) */
  tool?: string;
  /** Field name (if applicable) */
  field?: string;
  /** Suggestion for fixing the issue */
  suggestion?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Analysis verdict.
 */
export type Verdict = 'pass' | 'fail' | 'pass-with-warnings';

/**
 * Indexes for fast lookups.
 */
export interface Indexes {
  /** Map of tool name to ToolSpec */
  toolIndex: Map<string, ToolSpec>;
  /** Map of field name to FieldSpec[] (for inputs) */
  inputIndex: Map<string, FieldSpec[]>;
  /** Map of field name to FieldSpec[] (for outputs) */
  outputIndex: Map<string, FieldSpec[]>;
  /** Map of keyword to Set<tool names> */
  keywordIndex: Map<string, Set<string>>;
}

/**
 * Analysis context passed to rules.
 */
export interface AnalysisContext {
  /** All normalized tools */
  tools: ToolSpec[];
  /** Inferred dependencies */
  dependencies: Dependency[];
  /** Built indexes */
  indexes: Indexes;
}

/**
 * Analysis result.
 */
export interface AnalysisResult {
  /** Final verdict */
  verdict: Verdict;
  /** All diagnostics */
  diagnostics: Diagnostic[];
  /** Error diagnostics only */
  errors: Diagnostic[];
  /** Warning diagnostics only */
  warnings: Diagnostic[];
  /** Inferred dependencies */
  dependencies: Dependency[];
  /** Number of tools analyzed */
  toolCount: number;
}
