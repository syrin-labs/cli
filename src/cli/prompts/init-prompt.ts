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
  makeAPIKey,
  makeModelName,
  makeScriptCommand,
} from '@/types/factories';
import {
  Messages,
  TransportTypes,
  LLMProviders,
  LLMProviderDisplayNames,
  Defaults,
  EnvVars,
} from '@/constants';

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
  ollamaModelName?: string;
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
          return Messages.PROMPT_PROJECT_NAME_REQUIRED;
        }
        if (!/^[a-z0-9-]+$/i.test(input)) {
          return Messages.PROMPT_PROJECT_NAME_INVALID;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent name:',
      default: defaults?.agentName
        ? String(defaults.agentName)
        : Defaults.AGENT_NAME,
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return Messages.PROMPT_AGENT_NAME_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'transport',
      message: 'Transport type:',
      choices: [
        {
          name: `${TransportTypes.STDIO} - Spawn MCP server as a subprocess`,
          value: TransportTypes.STDIO,
        },
        {
          name: `${TransportTypes.HTTP} - Connect to a running MCP server via HTTP`,
          value: TransportTypes.HTTP,
        },
      ],
      default: defaults?.transport || Defaults.TRANSPORT,
    },
    {
      type: 'input',
      name: 'mcpUrl',
      message: 'MCP server URL:',
      default: defaults?.mcpUrl ? String(defaults.mcpUrl) : Defaults.MCP_URL,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers?.transport === TransportTypes.HTTP,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (answers?.transport === TransportTypes.HTTP) {
          if (!input.trim()) {
            return Messages.PROMPT_MCP_URL_REQUIRED;
          }
          try {
            new URL(input);
            return true;
          } catch {
            return Messages.PROMPT_URL_INVALID;
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
          return Messages.PROMPT_SCRIPT_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'checkbox',
      name: 'llmProviders',
      message: 'Select LLM providers to configure:',
      choices: [
        {
          name: LLMProviderDisplayNames.OPENAI,
          value: LLMProviders.OPENAI,
          checked: true,
        },
        {
          name: LLMProviderDisplayNames.CLAUDE,
          value: LLMProviders.CLAUDE,
        },
        {
          name: LLMProviderDisplayNames.OLLAMA,
          value: LLMProviders.OLLAMA,
        },
      ],
      default: defaults?.llmProviders
        ? Object.keys(defaults.llmProviders)
        : [LLMProviders.OPENAI],
      validate: (input: string[]): boolean | string => {
        if (input.length === 0) {
          return Messages.PROMPT_LLM_PROVIDER_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'openaiApiKey',
      message: 'OpenAI API Key (env var name or direct value):',
      default: EnvVars.OPENAI_API_KEY,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OPENAI) ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (
          answers?.llmProviders?.includes(LLMProviders.OPENAI) &&
          !input.trim()
        ) {
          return 'OpenAI API key is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'openaiModel',
      message: 'OpenAI Model Name (env var name or direct value):',
      default: EnvVars.OPENAI_MODEL_NAME,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OPENAI) ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (
          answers?.llmProviders?.includes(LLMProviders.OPENAI) &&
          !input.trim()
        ) {
          return Messages.PROMPT_OPENAI_MODEL_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'claudeApiKey',
      message: 'Claude API Key (env var name or direct value):',
      default: EnvVars.CLAUDE_API_KEY,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.CLAUDE) ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (
          answers?.llmProviders?.includes(LLMProviders.CLAUDE) &&
          !input.trim()
        ) {
          return Messages.PROMPT_CLAUDE_API_KEY_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'claudeModel',
      message: 'Claude Model Name (env var name or direct value):',
      default: EnvVars.CLAUDE_MODEL_NAME,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.CLAUDE) ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (
          answers?.llmProviders?.includes(LLMProviders.CLAUDE) &&
          !input.trim()
        ) {
          return Messages.PROMPT_CLAUDE_MODEL_REQUIRED;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'ollamaModelName',
      message: 'Ollama Model Name (e.g., "llama2", "mistral", "codellama"):',
      default: EnvVars.OLLAMA_MODEL_NAME,
      when: (answers: Partial<InitAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OLLAMA) ?? false,
      validate: (
        input: string,
        answers?: Partial<InitAnswers>
      ): boolean | string => {
        if (
          answers?.llmProviders?.includes(LLMProviders.OLLAMA) &&
          !input.trim()
        ) {
          return Messages.PROMPT_OLLAMA_MODEL_REQUIRED;
        }
        return true;
      },
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
      default: answers.defaultProvider === 'openai' || false,
    };
  }

  if (answers.llmProviders.includes('claude')) {
    llmProviders.claude = {
      apiKey: makeAPIKey(answers.claudeApiKey || ''),
      modelName: makeModelName(answers.claudeModel || ''),
      default: answers.defaultProvider === 'claude' || false,
    };
  }

  if (answers.llmProviders.includes('ollama')) {
    llmProviders.ollama = {
      modelName: answers.ollamaModelName
        ? makeModelName(answers.ollamaModelName)
        : undefined,
      default: answers.defaultProvider === 'ollama' || false,
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
    agentName: makeAgentName(Defaults.AGENT_NAME),
    transport: Defaults.TRANSPORT,
    script: makeScriptCommand(Defaults.SCRIPT_COMMAND),
    llmProviders: {
      openai: {
        apiKey: makeAPIKey(EnvVars.OPENAI_API_KEY),
        modelName: makeModelName(EnvVars.OPENAI_MODEL_NAME),
        default: true,
      },
    },
    nonInteractive: true,
  };
}
