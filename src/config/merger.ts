/**
 * Configuration merger.
 * Merges local and global configurations with proper precedence.
 */

import type { SyrinConfig, GlobalSyrinConfig } from './types';
import {
  makeProjectName,
  makeMCPURL,
  makeScriptCommand,
} from '@/types/factories';

/**
 * CLI flags that can override config values.
 */
export interface CLIConfigFlags {
  /** Transport type override */
  transport?: 'stdio' | 'http';
  /** MCP URL override (for http transport) */
  mcp_url?: string;
  /** Script command override (for stdio transport) */
  script?: string;
  /** LLM provider override */
  llm?: string;
}

/**
 * Merge local and global configurations.
 * Local LLM providers override global, but other global providers are kept.
 * @param local - Local configuration (from ./syrin.yaml) or null
 * @param global - Global configuration (from ~/.syrin/syrin.yaml) or null
 * @param flags - CLI flags that override config values
 * @returns Merged configuration
 * @throws {Error} If neither local nor global config exists
 */
export function mergeConfigs(
  local: SyrinConfig | null,
  global: GlobalSyrinConfig | null,
  flags: CLIConfigFlags = {}
): SyrinConfig {
  // If local config exists, use it as base and merge LLM providers
  if (local) {
    const mergedLLM = {
      ...(global?.llm || {}), // Start with global LLM providers
      ...local.llm, // Override with local LLM providers
    };

    // Apply CLI flag overrides
    const finalConfig: SyrinConfig = {
      ...local,
      llm: mergedLLM,
      transport: flags.transport || local.transport,
      mcp_url: flags.mcp_url ? makeMCPURL(flags.mcp_url) : local.mcp_url,
      script: flags.script ? makeScriptCommand(flags.script) : local.script,
    };

    return finalConfig;
  }

  // No local config - create from global with defaults
  if (!global) {
    throw new Error(
      'No configuration found. Create a local config with `syrin init` or set up global config with `syrin init --global`.'
    );
  }

  // Create config from global
  return createConfigFromGlobal(global, flags);
}

/**
 * Create a full SyrinConfig from global config and CLI flags.
 * @param global - Global configuration
 * @param flags - CLI flags that provide required fields
 * @returns Full configuration
 * @throws {Error} If required fields are missing
 */
export function createConfigFromGlobal(
  global: GlobalSyrinConfig,
  flags: CLIConfigFlags = {}
): SyrinConfig {
  // Transport is required - must come from flags
  if (!flags.transport) {
    throw new Error(
      'Transport type is required when using global config. Use --transport <stdio|http> flag.'
    );
  }

  // Validate transport-specific requirements
  if (flags.transport === 'http' && !flags.mcp_url) {
    throw new Error(
      'MCP URL is required for HTTP transport. Use --mcp-url <url> flag.'
    );
  }

  if (flags.transport === 'stdio' && !flags.script) {
    throw new Error(
      'Script command is required for stdio transport. Use --script <command> flag.'
    );
  }

  return {
    version: global.version,
    project_name: makeProjectName('GlobalSyrin'),
    agent_name: global.agent_name,
    transport: flags.transport as 'stdio' | 'http',
    mcp_url: flags.mcp_url ? makeMCPURL(flags.mcp_url) : undefined,
    script: flags.script ? makeScriptCommand(flags.script) : undefined,
    llm: global.llm,
  };
}
