/**
 * Configuration type definitions for Syrin.
 * These types represent the structure of the .syrin/config.yaml file.
 */

import type {
  ProjectName,
  AgentName,
  MCPURL,
  Command,
  APIKey,
  ModelName,
  ProviderIdentifier,
  ScriptCommand,
  SyrinVersion,
} from '@/types/ids';

export type TransportType = 'stdio' | 'http';

export interface LLMProviderConfig {
  /** API key for the LLM provider (can be an environment variable name) - required for cloud providers */
  API_KEY?: APIKey;
  /** Model name to use (can be an environment variable name) - required for cloud providers */
  MODEL_NAME?: ModelName;
  /** Whether this is the default LLM provider */
  default?: boolean;
  /** Provider type (only for local providers like Ollama) */
  provider?: ProviderIdentifier;
  /** Command to run local provider (only for local providers) */
  command?: Command;
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
    llama?: {
      provider?: ProviderIdentifier;
      command?: Command;
      default?: boolean;
    };
  };
  /** Skip interactive prompts (non-interactive mode) */
  nonInteractive?: boolean;
}
