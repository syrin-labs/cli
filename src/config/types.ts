/**
 * Configuration type definitions for Syrin.
 * These types represent the structure of the syrin.yaml file.
 */

import * as os from 'os';
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
 * Global Syrin configuration (LLM settings only).
 * Stored at ~/.syrin/syrin.yaml
 */
export interface GlobalSyrinConfig {
  /** Configuration version */
  version: SyrinVersion;
  /** Project name (always "GlobalSyrin") */
  project_name: 'GlobalSyrin';
  /** Agent name (defaults to system username, can be customized) */
  agent_name: AgentName;
  /** LLM provider configurations */
  llm: Record<string, LLMProviderConfig>;
}

/**
 * Get default agent name from system.
 * Tries: process.env.USER -> process.env.USERNAME -> os.userInfo().username -> 'Syrin'
 */
export function getDefaultAgentName(): string {
  // Try process.env first (safest)
  if (process.env.USER) {
    return process.env.USER;
  }
  if (process.env.USERNAME) {
    return process.env.USERNAME;
  }

  // Try os.userInfo() with error handling (can throw on some platforms)
  try {
    const username = os.userInfo().username;
    if (username) {
      return username;
    }
  } catch {
    // Swallow any exceptions from os.userInfo()
  }

  // Fallback to default
  return 'Syrin';
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
