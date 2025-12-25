/**
 * Configuration file generator.
 * Creates well-documented, production-ready config.yaml files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { InitOptions, SyrinConfig } from '@/config/types';
import { makeSyrinVersion } from '@/types/factories';
import { Paths } from '@/constants';

/**
 * Generate a production-ready config.yaml file with comprehensive documentation.
 * @param options - Initialization options
 * @param configDir - Directory where .syrin/config.yaml will be created
 * @returns Path to the created config file
 */
export function generateConfigFile(
  options: InitOptions,
  configDir: string
): string {
  const configPath = path.join(configDir, Paths.CONFIG_FILE);

  // Ensure .syrin directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configContent = buildConfigContent(options);

  fs.writeFileSync(configPath, configContent, 'utf-8');

  return configPath;
}

/**
 * Build the YAML content for the config file with documentation.
 */
function buildConfigContent(options: InitOptions): string {
  const config: SyrinConfig = {
    version: makeSyrinVersion('1.0.0'),
    project_name: options.projectName,
    agent_name: options.agentName,
    transport: options.transport,
    scripts: {
      dev: options.devScript,
      start: options.startScript,
    },
    llm: buildLLMConfig(options.llmProviders),
  };

  // Add transport-specific fields
  if (options.transport === 'http' && options.mcpUrl) {
    config.mcp_url = options.mcpUrl;
  } else if (options.transport === 'stdio' && options.command) {
    config.command = options.command;
  }

  // Build YAML content with comments
  const lines: string[] = [];

  lines.push('# Syrin Configuration File');
  lines.push('# ========================');
  lines.push('# This file configures your Syrin runtime environment.');
  lines.push(
    '# For detailed documentation, visit: https://github.com/AnkanAI/syrin'
  );
  lines.push('');
  lines.push('# Configuration Version');
  lines.push('# The version of this configuration schema.');
  lines.push(`version: "${String(config.version)}"`);
  lines.push('');
  lines.push('# Project Configuration');
  lines.push('# ---------------------');
  lines.push('# Project name: A unique identifier for your MCP server project');
  lines.push(`project_name: "${String(config.project_name)}"`);
  lines.push('');
  lines.push(
    '# Agent name: The name of your AI agent that will interact with the MCP server'
  );
  lines.push(`agent_name: "${String(config.agent_name)}"`);
  lines.push('');
  lines.push('# Transport Configuration');
  lines.push('# -----------------------');
  lines.push('# Transport type: How Syrin communicates with your MCP server');
  lines.push(
    '#   - "stdio": Communicate via standard input/output (spawns the MCP server process)'
  );
  lines.push(
    '#   - "http":  Communicate via HTTP (connects to a running MCP server)'
  );
  lines.push(`transport: "${config.transport}"`);
  lines.push('');

  // Transport-specific configuration
  if (config.transport === 'http') {
    lines.push('# MCP Server URL (required for http transport)');
    lines.push('# The HTTP endpoint where your MCP server is running');
    lines.push('# Example: "http://localhost:8000/mcp"');
    lines.push(`mcp_url: "${String(config.mcp_url)}"`);
    lines.push('');
    lines.push('# Command (not used for http transport)');
    lines.push('# Uncomment and configure if you switch to stdio transport');
    lines.push('# command: "python3 server.py"');
    lines.push('');
  } else {
    lines.push('# Command (required for stdio transport)');
    lines.push('# The command to start your MCP server process');
    lines.push('# Example: "python3 server.py" or "node server.js"');
    lines.push(`command: "${String(config.command)}"`);
    lines.push('');
    lines.push('# MCP Server URL (not used for stdio transport)');
    lines.push('# Uncomment and configure if you switch to http transport');
    lines.push('# mcp_url: "http://localhost:8000/mcp"');
    lines.push('');
  }

  lines.push('# Script Configuration');
  lines.push('# --------------------');
  lines.push('# Scripts that Syrin can use to run your MCP server');
  lines.push(
    '#   - dev:   Command used during development (e.g., "python3 server.py --dev")'
  );
  lines.push(
    '#   - start: Command used in production (e.g., "python3 server.py")'
  );
  lines.push('scripts:');
  if (config.scripts) {
    lines.push(`  dev: "${String(config.scripts.dev)}"`);
    lines.push(`  start: "${String(config.scripts.start)}"`);
  } else {
    lines.push('  # Script section is missing - uncomment and configure:');
    lines.push('  # dev: "python3 server.py"');
    lines.push('  # start: "python3 server.py"');
  }
  lines.push('');

  lines.push('# LLM Provider Configuration');
  lines.push('# ---------------------------');
  lines.push('# Configure one or more LLM providers for Syrin to use.');
  lines.push('# API keys and model names can be set as:');
  lines.push('#   - Environment variable names (recommended for security)');
  lines.push('#   - Direct values (not recommended for production)');
  lines.push('# At least one provider must be marked as default: true');
  lines.push('');
  lines.push('llm:');

  // Generate LLM provider configurations
  const llmEntries = Object.entries(config.llm);
  for (const [providerName, providerConfig] of llmEntries) {
    lines.push(`  # ${providerName.toUpperCase()} Provider`);
    lines.push(`  ${providerName}:`);

    if (providerName === 'llama') {
      // Local provider (Ollama)
      if (providerConfig.provider) {
        lines.push(
          '    # Provider identifier for local LLM (e.g., "ollama/local")'
        );
        lines.push(`    provider: "${String(providerConfig.provider)}"`);
      }
      if (providerConfig.command) {
        lines.push('    # Command to start local LLM server (if needed)');
        lines.push(`    command: "${String(providerConfig.command)}"`);
      }
      if (providerConfig.default) {
        lines.push('    # Set as default LLM provider');
        lines.push('    default: true');
      }
    } else {
      // Cloud providers (OpenAI, Claude)
      if (providerConfig.API_KEY) {
        lines.push(
          '    # API key: Set as environment variable name or direct value'
        );
        lines.push(
          '    # Example: "OPENAI_API_KEY" (reads from process.env.OPENAI_API_KEY)'
        );
        lines.push('    # Or: "sk-..." (direct value, not recommended)');
        lines.push(`    API_KEY: "${String(providerConfig.API_KEY)}"`);
        lines.push('');
      }
      if (providerConfig.MODEL_NAME) {
        lines.push(
          '    # Model name: Set as environment variable name or direct value'
        );
        lines.push(
          '    # Example: "OPENAI_MODEL_NAME" (reads from process.env.OPENAI_MODEL_NAME)'
        );
        lines.push('    # Or: "gpt-4" (direct value)');
        lines.push(`    MODEL_NAME: "${String(providerConfig.MODEL_NAME)}"`);
        lines.push('');
      }

      if (providerConfig.default) {
        lines.push('    # Set as default LLM provider');
        lines.push('    default: true');
      }
    }

    // Add commented-out alternative providers
    if (
      providerName === 'openai' &&
      !llmEntries.some(([name]) => name === 'claude')
    ) {
      lines.push('');
      lines.push('  # Claude Provider (uncomment to enable)');
      lines.push('  # claude:');
      lines.push('  #   API_KEY: "CLAUDE_API_KEY"');
      lines.push('  #   MODEL_NAME: "CLAUDE_MODEL_NAME"');
      lines.push('  #   default: false');
    } else if (
      providerName === 'claude' &&
      !llmEntries.some(([name]) => name === 'openai')
    ) {
      lines.push('');
      lines.push('  # OpenAI Provider (uncomment to enable)');
      lines.push('  # openai:');
      lines.push('  #   API_KEY: "OPENAI_API_KEY"');
      lines.push('  #   MODEL_NAME: "OPENAI_MODEL_NAME"');
      lines.push('  #   default: false');
    }

    if (!llmEntries.some(([name]) => name === 'llama')) {
      lines.push('');
      lines.push('  # Local LLM Provider (Ollama) - uncomment to enable');
      lines.push('  # llama:');
      lines.push('  #   provider: "ollama/local"');
      lines.push('  #   command: "<command to run from local>"');
      lines.push('  #   default: false');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build LLM configuration object from init options.
 */
function buildLLMConfig(
  providers: InitOptions['llmProviders']
): Record<string, SyrinConfig['llm'][string]> {
  const llmConfig: Record<string, SyrinConfig['llm'][string]> = {};

  if (providers.openai) {
    llmConfig.openai = {
      API_KEY: providers.openai.apiKey,
      MODEL_NAME: providers.openai.modelName,
      default: providers.openai.default ?? false,
    };
  }

  if (providers.claude) {
    llmConfig.claude = {
      API_KEY: providers.claude.apiKey,
      MODEL_NAME: providers.claude.modelName,
      default: providers.claude.default ?? false,
    };
  }

  if (providers.llama) {
    // For local providers, we don't include API_KEY and MODEL_NAME
    const llamaConfig: SyrinConfig['llm'][string] = {
      provider: providers.llama.provider,
      command: providers.llama.command,
      default: providers.llama.default ?? false,
    };
    llmConfig.llama = llamaConfig;
  }

  return llmConfig;
}

/**
 * Check if a Syrin project is already initialized in the current directory.
 * @param projectRoot - Root directory of the project
 * @returns true if project is already initialized
 */
export function isProjectInitialized(projectRoot: string): boolean {
  const configPath = path.join(projectRoot, Paths.SYRIN_DIR, Paths.CONFIG_FILE);
  return fs.existsSync(configPath);
}
