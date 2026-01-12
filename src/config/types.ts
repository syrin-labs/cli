/**
 * Configuration type definitions for Syrin.
 * These types represent the structure of the syrin.yaml file.
 */

import type {
  ProjectName,
  AgentName,
  MCPURL,
  APIKey,
  ModelName,
  ScriptCommand,
  SyrinVersion,
} from '@/types/ids';

export type TransportType = 'stdio' | 'http';

export interface LLMProviderConfig {
  /** API key for the LLM provider (can be an environment variable name) - required for cloud providers */
  API_KEY?: APIKey;
  /** Model name to use (can be an environment variable name) - required for cloud providers and Ollama */
  MODEL_NAME?: ModelName;
  /** Whether this is the default LLM provider */
  default?: boolean;
}

export interface CheckConfig {
  /** Timeout for tool execution in milliseconds */
  timeout_ms?: number;
  /** Memory limit for sandboxed processes in MB */
  memory_limit_mb?: number;
  /** Tools directory name (relative to project root, default: "tools") */
  tools_dir?: string;
  /** Maximum output size in KB (default: 50) */
  max_output_size_kb?: number;
  /** Number of runs for determinism checking (default: 3) */
  determinism_runs?: number;
  /** Enable retry scenario testing (default: true) */
  test_retries?: boolean;
  /** Maximum retries to test (default: 3) */
  max_retries?: number;
  /** Retry delay in milliseconds (default: 100) */
  retry_delay_ms?: number;
  /** Strict mode: warnings become errors (default: false) */
  strict_mode?: boolean;
}

export interface SyrinConfig {
  /** Configuration version */
  version: SyrinVersion;
  /** Project name */
  project_name: ProjectName;
  /** Agent name */
  agent_name: AgentName;
  /** Transport type (stdio or http) */
  transport: TransportType;
  /** MCP server URL (required for http transport) */
  mcp_url?: MCPURL;
  /** Script command to run the MCP server (required for stdio transport) */
  script?: ScriptCommand;
  /** LLM provider configurations */
  llm: Record<string, LLMProviderConfig>;
  /** Tool testing configuration (v1.3.0) */
  check?: CheckConfig;
}

/**
 * Options for initializing a new Syrin project.
 */
export interface InitOptions {
  /** Project name */
  projectName: ProjectName;
  /** Agent name */
  agentName: AgentName;
  /** Transport type */
  transport: TransportType;
  /** MCP server URL (for http transport) */
  mcpUrl?: MCPURL;
  /** Script command to run the MCP server */
  script: ScriptCommand;
  /** LLM providers to configure */
  llmProviders: {
    openai?: { apiKey: APIKey; modelName: ModelName; default?: boolean };
    claude?: { apiKey: APIKey; modelName: ModelName; default?: boolean };
    ollama?: {
      modelName?: ModelName;
      default?: boolean;
    };
  };
  /** Skip interactive prompts (non-interactive mode) */
  nonInteractive?: boolean;
}
