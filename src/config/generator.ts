/**
 * Configuration file generator.
 * Creates well-documented, production-ready syrin.yaml files from template.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { InitOptions, SyrinConfig } from '@/config/types';
import { makeSyrinVersion } from '@/types/factories';
import { Paths } from '@/constants';

/**
 * Get the path to the template file.
 * The template is located in the same directory as this file.
 */
function getTemplatePath(): string {
  // Get the directory of the current file using import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, 'syrin.template.yaml');
}

/**
 * Read the template file.
 */
function readTemplate(): string {
  const templatePath = getTemplatePath();
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template file not found: ${templatePath}. This is a build error.`
    );
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Generate a production-ready syrin.yaml file with comprehensive documentation.
 * @param options - Initialization options
 * @param projectRoot - Root directory where syrin.yaml will be created
 * @returns Path to the created config file
 */
export function generateConfigFile(
  options: InitOptions,
  projectRoot: string
): string {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);

  const configContent = buildConfigContent(options);

  fs.writeFileSync(configPath, configContent, 'utf-8');

  return configPath;
}

/**
 * Build the YAML content for the config file from template.
 */
function buildConfigContent(options: InitOptions): string {
  const config: SyrinConfig = {
    version: makeSyrinVersion('1.0.0'),
    project_name: options.projectName,
    agent_name: options.agentName,
    transport: options.transport,
    script: options.script,
    llm: buildLLMConfig(options.llmProviders),
  };

  // Add transport-specific fields
  if (options.transport === 'http' && options.mcpUrl) {
    config.mcp_url = options.mcpUrl;
  }

  // Read template
  let template = readTemplate();

  // Replace simple placeholders
  template = template.replace(/\{\{VERSION\}\}/g, String(config.version));
  template = template.replace(
    /\{\{PROJECT_NAME\}\}/g,
    String(config.project_name)
  );
  template = template.replace(/\{\{AGENT_NAME\}\}/g, String(config.agent_name));
  template = template.replace(/\{\{TRANSPORT\}\}/g, config.transport);

  // Handle transport-specific blocks
  if (config.transport === 'http' && config.mcp_url) {
    template = template.replace(
      /\{\{#IF_HTTP\}\}([\s\S]*?)\{\{\/IF_HTTP\}\}/g,
      (match, content) => {
        return content.replace(/\{\{MCP_URL\}\}/g, String(config.mcp_url));
      }
    );
    template = template.replace(
      /\{\{#IF_STDIO\}\}([\s\S]*?)\{\{\/IF_STDIO\}\}/g,
      ''
    );
  } else {
    template = template.replace(
      /\{\{#IF_HTTP\}\}([\s\S]*?)\{\{\/IF_HTTP\}\}/g,
      ''
    );
    template = template.replace(
      /\{\{#IF_STDIO\}\}([\s\S]*?)\{\{\/IF_STDIO\}\}/g,
      (match, content) => content
    );
  }

  // Handle script blocks
  if (config.script) {
    template = template.replace(
      /\{\{#IF_SCRIPT\}\}([\s\S]*?)\{\{\/IF_SCRIPT\}\}/g,
      (match, content) => {
        return content.replace(/\{\{SCRIPT\}\}/g, String(config.script));
      }
    );
    template = template.replace(
      /\{\{#IF_NO_SCRIPT\}\}([\s\S]*?)\{\{\/IF_NO_SCRIPT\}\}/g,
      ''
    );
  } else {
    template = template.replace(
      /\{\{#IF_SCRIPT\}\}([\s\S]*?)\{\{\/IF_SCRIPT\}\}/g,
      ''
    );
    template = template.replace(
      /\{\{#IF_NO_SCRIPT\}\}([\s\S]*?)\{\{\/IF_NO_SCRIPT\}\}/g,
      (match, content) => content
    );
  }

  // Handle LLM providers loop
  const llmEntries = Object.entries(config.llm);
  const hasOpenAI = llmEntries.some(([name]) => name === 'openai');
  const hasClaude = llmEntries.some(([name]) => name === 'claude');
  const hasOllama = llmEntries.some(([name]) => name === 'ollama');

  // Extract the LLM provider template block
  const llmTemplateMatch = template.match(
    /\{\{#LLM_PROVIDERS\}\}([\s\S]*?)\{\{\/LLM_PROVIDERS\}\}/
  );
  if (!llmTemplateMatch) {
    throw new Error('LLM_PROVIDERS template block not found');
  }
  const providerTemplate = llmTemplateMatch[1]!;

  let llmSection = '';
  for (const [providerName, providerConfig] of llmEntries) {
    const isOllama = providerName === 'ollama';
    const isDefault = providerConfig.default === true;
    const providerNameUpper = providerName.toUpperCase();

    // Start with a fresh copy of the template for each provider
    let providerBlock = providerTemplate;

    // Replace provider-specific placeholders
    providerBlock = providerBlock.replace(
      /\{\{PROVIDER_NAME\}\}/g,
      providerName
    );
    providerBlock = providerBlock.replace(
      /\{\{PROVIDER_NAME_UPPER\}\}/g,
      providerNameUpper
    );

    // Handle Ollama vs Cloud provider blocks
    if (isOllama) {
      providerBlock = providerBlock.replace(
        /\{\{#IF_OLLAMA\}\}([\s\S]*?)\{\{\/IF_OLLAMA\}\}/g,
        (match, content) => {
          return content.replace(
            /\{\{MODEL_NAME\}\}/g,
            String(providerConfig.MODEL_NAME || '')
          );
        }
      );
      providerBlock = providerBlock.replace(
        /\{\{#IF_CLOUD_PROVIDER\}\}([\s\S]*?)\{\{\/IF_CLOUD_PROVIDER\}\}/g,
        ''
      );
    } else {
      providerBlock = providerBlock.replace(
        /\{\{#IF_OLLAMA\}\}([\s\S]*?)\{\{\/IF_OLLAMA\}\}/g,
        ''
      );
      providerBlock = providerBlock.replace(
        /\{\{#IF_CLOUD_PROVIDER\}\}([\s\S]*?)\{\{\/IF_CLOUD_PROVIDER\}\}/g,
        (match, content) => {
          return content
            .replace(/\{\{API_KEY\}\}/g, String(providerConfig.API_KEY || ''))
            .replace(
              /\{\{MODEL_NAME\}\}/g,
              String(providerConfig.MODEL_NAME || '')
            );
        }
      );
    }

    // Handle default flag
    if (isDefault) {
      providerBlock = providerBlock.replace(
        /\{\{#IF_DEFAULT\}\}([\s\S]*?)\{\{\/IF_DEFAULT\}\}/g,
        (match, content) => content
      );
      providerBlock = providerBlock.replace(
        /\{\{#IF_NOT_DEFAULT\}\}([\s\S]*?)\{\{\/IF_NOT_DEFAULT\}\}/g,
        ''
      );
    } else {
      providerBlock = providerBlock.replace(
        /\{\{#IF_DEFAULT\}\}([\s\S]*?)\{\{\/IF_DEFAULT\}\}/g,
        ''
      );
      providerBlock = providerBlock.replace(
        /\{\{#IF_NOT_DEFAULT\}\}([\s\S]*?)\{\{\/IF_NOT_DEFAULT\}\}/g,
        (match, content) => content
      );
    }

    // Handle alternative provider suggestions (only show once per provider type)
    if (providerName === 'openai' && !hasClaude) {
      providerBlock = providerBlock.replace(
        /\{\{#IF_OPENAI_AND_NO_CLAUDE\}\}([\s\S]*?)\{\{\/IF_OPENAI_AND_NO_CLAUDE\}\}/g,
        (match, content) => content
      );
    } else {
      providerBlock = providerBlock.replace(
        /\{\{#IF_OPENAI_AND_NO_CLAUDE\}\}([\s\S]*?)\{\{\/IF_OPENAI_AND_NO_CLAUDE\}\}/g,
        ''
      );
    }

    if (providerName === 'claude' && !hasOpenAI) {
      providerBlock = providerBlock.replace(
        /\{\{#IF_CLAUDE_AND_NO_OPENAI\}\}([\s\S]*?)\{\{\/IF_CLAUDE_AND_NO_OPENAI\}\}/g,
        (match, content) => content
      );
    } else {
      providerBlock = providerBlock.replace(
        /\{\{#IF_CLAUDE_AND_NO_OPENAI\}\}([\s\S]*?)\{\{\/IF_CLAUDE_AND_NO_OPENAI\}\}/g,
        ''
      );
    }

    // Only show Ollama suggestion if no Ollama provider exists
    // But only add it once (on the last provider)
    const isLastProvider =
      llmEntries[llmEntries.length - 1]![0] === providerName;
    if (isLastProvider && !hasOllama) {
      providerBlock = providerBlock.replace(
        /\{\{#IF_NO_OLLAMA\}\}([\s\S]*?)\{\{\/IF_NO_OLLAMA\}\}/g,
        (match, content) => content
      );
    } else {
      providerBlock = providerBlock.replace(
        /\{\{#IF_NO_OLLAMA\}\}([\s\S]*?)\{\{\/IF_NO_OLLAMA\}\}/g,
        ''
      );
    }

    llmSection += providerBlock;
  }

  // Replace LLM providers section
  template = template.replace(
    /\{\{#LLM_PROVIDERS\}\}([\s\S]*?)\{\{\/LLM_PROVIDERS\}\}/,
    llmSection
  );

  // Clean up whitespace
  template = cleanupYamlWhitespace(template);

  return template;
}

/**
 * Clean up excessive whitespace in generated YAML.
 * - Removes trailing whitespace from lines
 * - Collapses 3+ consecutive blank lines into 2
 * - Ensures file ends with single newline
 */
function cleanupYamlWhitespace(content: string): string {
  return (
    content
      // Remove trailing whitespace from each line
      .replace(/[ \t]+$/gm, '')
      // Collapse 3+ consecutive newlines into 2 (one blank line)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure single newline at end of file
      .replace(/\n*$/, '\n')
  );
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

  if (providers.ollama) {
    llmConfig.ollama = {
      MODEL_NAME: providers.ollama.modelName,
      default: providers.ollama.default ?? false,
    };
  }

  return llmConfig;
}

/**
 * Check if a Syrin project is already initialized in the current directory.
 * @param projectRoot - Root directory of the project
 * @returns true if project is already initialized
 */
export function isProjectInitialized(projectRoot: string): boolean {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);
  return fs.existsSync(configPath);
}
