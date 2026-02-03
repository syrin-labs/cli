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
 * Interface for LLM-related answers (shared between init and global init).
 */
interface LLMAnswers {
  llmProviders: string[];
  openaiApiKey?: string;
  openaiModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
  ollamaModelName?: string;
  defaultProvider: string;
}

/**
 * Interface for inquirer answers.
 */
interface InitAnswers extends LLMAnswers {
  projectName: string;
  agentName: string;
  transport: TransportType;
  mcpUrl?: string;
  script: string;
}

/**
 * Interface for global init answers (LLM providers only).
 */
interface GlobalInitAnswers extends LLMAnswers {
  agentName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
type QuestionArray = any[];

/**
 * Get LLM provider prompts (shared between init and global init).
 * @param defaultProviders - Default providers to check (for non-interactive mode)
 * @returns Array of inquirer questions for LLM provider configuration
 */
function getLLMProviderPrompts(defaultProviders?: string[]): QuestionArray {
  return [
    {
      type: 'checkbox',
      name: 'llmProviders',
      message:
        'Select LLM providers to configure (SPACE to toggle, ENTER to confirm):',
      choices: [
        {
          name: LLMProviderDisplayNames.OPENAI,
          value: LLMProviders.OPENAI,
          checked: defaultProviders?.includes(LLMProviders.OPENAI) ?? true,
        },
        {
          name: LLMProviderDisplayNames.CLAUDE,
          value: LLMProviders.CLAUDE,
          checked: defaultProviders?.includes(LLMProviders.CLAUDE) ?? false,
        },
        {
          name: LLMProviderDisplayNames.OLLAMA,
          value: LLMProviders.OLLAMA,
          checked: defaultProviders?.includes(LLMProviders.OLLAMA) ?? false,
        },
      ],
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
      when: (answers: Partial<LLMAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OPENAI) ?? false,
      validate: (
        input: string,
        answers?: Partial<LLMAnswers>
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
      when: (answers: Partial<LLMAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OPENAI) ?? false,
      validate: (
        input: string,
        answers?: Partial<LLMAnswers>
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
      when: (answers: Partial<LLMAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.CLAUDE) ?? false,
      validate: (
        input: string,
        answers?: Partial<LLMAnswers>
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
      when: (answers: Partial<LLMAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.CLAUDE) ?? false,
      validate: (
        input: string,
        answers?: Partial<LLMAnswers>
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
      when: (answers: Partial<LLMAnswers>): boolean =>
        answers.llmProviders?.includes(LLMProviders.OLLAMA) ?? false,
      validate: (
        input: string,
        answers?: Partial<LLMAnswers>
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
      choices: (answers: Partial<LLMAnswers>): string[] =>
        answers.llmProviders || [],
      default: (answers: Partial<LLMAnswers>): string | undefined =>
        answers.llmProviders?.[0],
    },
  ];
}

/**
 * Build LLM providers config from answers (shared between init and global init).
 * @param answers - User answers containing LLM provider selections
 * @returns LLM providers configuration object
 */
function buildLLMProvidersConfig(
  answers: LLMAnswers
): InitOptions['llmProviders'] {
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

  if (answers.llmProviders.includes('ollama')) {
    llmProviders.ollama = {
      modelName: answers.ollamaModelName
        ? makeModelName(answers.ollamaModelName)
        : undefined,
      default: answers.defaultProvider === 'ollama',
    };
  }

  return llmProviders;
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

  const projectPrompts: QuestionArray = [
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
  ];

  const transportQuestion = {
    type: 'rawlist',
    name: 'transport',
    message:
      'Select transport type (Use arrow keys or number keys, ENTER to confirm):',
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
    pageSize: 2,
    loop: false,
  } as const;

  projectPrompts.push({
    ...transportQuestion,
    default: defaults?.transport ?? TransportTypes.STDIO,
  });

  projectPrompts.push({
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
  });

  projectPrompts.push({
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
  });

  // Combine project prompts with LLM provider prompts
  const llmPrompts = getLLMProviderPrompts(
    defaults?.llmProviders ? Object.keys(defaults.llmProviders) : undefined
  );
  const allPrompts = [...projectPrompts, ...llmPrompts];

  const answers = await inquirer.prompt<InitAnswers>(allPrompts);

  return {
    projectName: makeProjectName(answers.projectName),
    agentName: makeAgentName(answers.agentName),
    transport: answers.transport,
    mcpUrl: answers.mcpUrl ? makeMCPURL(answers.mcpUrl) : undefined,
    script: makeScriptCommand(answers.script),
    llmProviders: buildLLMProvidersConfig(answers),
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

/**
 * Global init options (LLM providers only).
 */
export interface GlobalInitOptions {
  agentName: ReturnType<typeof makeAgentName>;
  llmProviders: InitOptions['llmProviders'];
}

/**
 * Prompt user for global initialization details (LLM providers only).
 * @returns User's answers for global config
 */
export async function promptGlobalInitOptions(): Promise<GlobalInitOptions> {
  const answers = await inquirer.prompt<GlobalInitAnswers>([
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent name:',
      default: Defaults.AGENT_NAME,
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return Messages.PROMPT_AGENT_NAME_REQUIRED;
        }
        return true;
      },
    },
    ...getLLMProviderPrompts(),
  ]);

  return {
    agentName: makeAgentName(answers.agentName),
    llmProviders: buildLLMProvidersConfig(answers),
  };
}

/**
 * Create default global init options for non-interactive mode.
 * @returns Default options for global config
 */
export function getDefaultGlobalInitOptions(): GlobalInitOptions {
  return {
    agentName: makeAgentName(Defaults.AGENT_NAME),
    llmProviders: {
      openai: {
        apiKey: makeAPIKey(EnvVars.OPENAI_API_KEY),
        modelName: makeModelName(EnvVars.OPENAI_MODEL_NAME),
        default: true,
      },
    },
  };
}
