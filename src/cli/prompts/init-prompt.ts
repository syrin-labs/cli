/**
 * Interactive prompts for the `syrin init` command.
 */

import inquirer from 'inquirer';
import * as path from 'path';
import type { InitOptions, TransportType } from '@/config/types';
import {
  makeProjectName,
  makeAgentName,
  makeMCPURL,
  makeCommand,
  makeAPIKey,
  makeModelName,
  makeProviderIdentifier,
  makeScriptCommand,
} from '@/types/factories';

/**
 * Interface for inquirer answers.
 */
interface InitAnswers {
  projectName: string;
  agentName: string;
  transport: TransportType;
  mcpUrl?: string;
  script: string;
  llmProviders: string[];
  openaiApiKey?: string;
  openaiModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
  llamaProvider?: string;
  llamaCommand?: string;
  defaultProvider: string;
}

/**
 * Prompt user for project initialization details.
 * @param defaults - Default values for non-interactive mode
 * @returns User's answers
 */
export async function promptInitOptions(
  defaults?: Partial<InitOptions>
): Promise<InitOptions> {
  const currentDirName = path.basename(process.cwd());
  const defaultProjectName =
    defaults?.projectName ||
    currentDirName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultProjectName,
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-]+$/i.test(input)) {
          return 'Project name can only contain letters, numbers, and hyphens';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent name:',
      default: defaults?.agentName ? String(defaults.agentName) : 'Agent',
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return 'Agent name is required';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'transport',
      message: 'Transport type:',
      choices: [
        { name: 'stdio - Spawn MCP server as a subprocess', value: 'stdio' },
        {
          name: 'http - Connect to a running MCP server via HTTP',
          value: 'http',
        },
      ],
      default: defaults?.transport || 'stdio',
    },
    {
      type: 'input',
      name: 'mcpUrl',
      message: 'MCP server URL:',
      default: defaults?.mcpUrl
        ? String(defaults.mcpUrl)
        : 'http://localhost:8000/mcp',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers?.transport === 'http',
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.transport === 'http') {
          if (!input.trim()) {
            return 'MCP server URL is required for http transport';
          }
          try {
            new URL(input);
            return true;
          } catch {
            return 'Invalid URL format';
          }
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'script',
      message: 'Script command to run MCP server:',
      default: defaults?.script ? String(defaults.script) : 'python3 server.py',
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return 'Script command is required';
        }
        return true;
      },
    },
    {
      type: 'checkbox',
      name: 'llmProviders',
      message: 'Select LLM providers to configure:',
      choices: [
        { name: 'OpenAI', value: 'openai', checked: true },
        { name: 'Claude (Anthropic)', value: 'claude' },
        { name: 'Local LLM (Ollama)', value: 'llama' },
      ],
      default: defaults?.llmProviders
        ? Object.keys(defaults.llmProviders)
        : ['openai'],
      validate: (input: string[]): boolean | string => {
        if (input.length === 0) {
          return 'At least one LLM provider must be selected';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'openaiApiKey',
      message: 'OpenAI API Key (env var name or direct value):',
      default: 'OPENAI_API_KEY',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('openai') ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.llmProviders?.includes('openai') && !input.trim()) {
          return 'OpenAI API key is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'openaiModel',
      message: 'OpenAI Model Name (env var name or direct value):',
      default: 'OPENAI_MODEL_NAME',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('openai') ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.llmProviders?.includes('openai') && !input.trim()) {
          return 'OpenAI model name is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'claudeApiKey',
      message: 'Claude API Key (env var name or direct value):',
      default: 'CLAUDE_API_KEY',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('claude') ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.llmProviders?.includes('claude') && !input.trim()) {
          return 'Claude API key is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'claudeModel',
      message: 'Claude Model Name (env var name or direct value):',
      default: 'CLAUDE_MODEL_NAME',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('claude') ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.llmProviders?.includes('claude') && !input.trim()) {
          return 'Claude model name is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'llamaProvider',
      message: 'Local LLM Provider identifier (e.g., "ollama/local"):',
      default: 'ollama/local',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('llama') ?? false,
    },
    {
      type: 'input',
      name: 'llamaCommand',
      message: 'Local LLM Command (optional):',
      default: '',
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes('llama') ?? false,
    },
    {
      type: 'list',
      name: 'defaultProvider',
      message: 'Default LLM provider:',
      choices: (answers: Partial<InitAnswers>): string[] =>
        answers.llmProviders || [],
      default: (answers: Partial<InitAnswers>): string =>
        answers.llmProviders?.[0] || 'openai',
    },
  ]);

  // Build LLM providers config
  const llmProviders: InitOptions['llmProviders'] = {};

  if (answers.llmProviders.includes('openai')) {
    llmProviders.openai = {
      apiKey: makeAPIKey(answers.openaiApiKey || ''),
      modelName: makeModelName(answers.openaiModel || ''),
      default: answers.defaultProvider === 'openai',
    };
  }

  if (answers.llmProviders.includes('claude')) {
    llmProviders.claude = {
      apiKey: makeAPIKey(answers.claudeApiKey || ''),
      modelName: makeModelName(answers.claudeModel || ''),
      default: answers.defaultProvider === 'claude',
    };
  }

  if (answers.llmProviders.includes('llama')) {
    llmProviders.llama = {
      provider: answers.llamaProvider
        ? makeProviderIdentifier(answers.llamaProvider)
        : undefined,
      command: answers.llamaCommand
        ? makeCommand(answers.llamaCommand)
        : undefined,
      default: answers.defaultProvider === 'llama',
    };
  }

  return {
    projectName: makeProjectName(answers.projectName),
    agentName: makeAgentName(answers.agentName),
    transport: answers.transport,
    mcpUrl: answers.mcpUrl ? makeMCPURL(answers.mcpUrl) : undefined,
    script: makeScriptCommand(answers.script),
    llmProviders,
    nonInteractive: false,
  };
}

/**
 * Create default init options for non-interactive mode.
 * @param projectRoot - Root directory of the project
 * @returns Default options
 */
export function getDefaultInitOptions(projectRoot: string): InitOptions {
  const currentDirName = path.basename(projectRoot);
  const defaultProjectNameStr = currentDirName
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();

  return {
    projectName: makeProjectName(defaultProjectNameStr),
    agentName: makeAgentName('Agent'),
    transport: 'stdio',
    script: makeScriptCommand('python3 server.py'),
    llmProviders: {
      openai: {
        apiKey: makeAPIKey('OPENAI_API_KEY'),
        modelName: makeModelName('OPENAI_MODEL_NAME'),
        default: true,
      },
    },
    nonInteractive: true,
  };
}
