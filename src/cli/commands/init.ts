/**
 * `syrin init` command implementation.
 * Initializes a new Syrin project with configuration.
 */

import { generateConfigFile, isProjectInitialized } from '@/config/generator';
import {
  promptInitOptions,
  getDefaultInitOptions,
  promptGlobalInitOptions,
  getDefaultGlobalInitOptions,
} from '@/cli/prompts/init-prompt';
import type { GlobalInitOptions } from '@/cli/prompts/init-prompt';
import { ConfigurationError } from '@/utils/errors';
import { log } from '@/utils/logger';
import type { InitOptions, GlobalSyrinConfig } from '@/config/types';
import { Messages, Paths } from '@/constants';
import { ensureGitignorePattern } from '@/utils/gitignore';
import {
  displayAlreadyInitialized,
  displayInitSuccess,
  displayGlobalAlreadyInitialized,
  displayGlobalInitSuccess,
} from '@/presentation/init-ui';
import { showVersionBanner } from '@/cli/utils/version-banner';
import {
  globalConfigExists,
  saveGlobalConfig,
  getGlobalConfigPath,
} from '@/config/global-loader';
import { makeSyrinVersion, makeAPIKey, makeModelName } from '@/types/factories';

export interface InitCommandOptions {
  /** Skip interactive prompts, use defaults */
  yes?: boolean;
  /** Project root directory (defaults to current working directory) */
  projectRoot?: string;
  /** Create global configuration (LLM providers only) */
  global?: boolean;
}

/**
 * Execute the init command.
 * @param options - Command options
 */
export async function executeInit(
  options: InitCommandOptions = {}
): Promise<void> {
  await showVersionBanner();

  // Handle global init
  if (options.global) {
    await executeGlobalInit(options);
    return;
  }

  const projectRoot = options.projectRoot || process.cwd();

  // Check if project is already initialized
  if (isProjectInitialized(projectRoot)) {
    displayAlreadyInitialized();
    // Exit gracefully without showing error stack
    return;
  }

  let initOptions: InitOptions;

  if (options.yes) {
    // Non-interactive mode: use defaults
    log.info('Initializing project with default values (non-interactive mode)');
    initOptions = getDefaultInitOptions(projectRoot);
  } else {
    // Interactive mode: prompt user
    log.info('Starting interactive project initialization');
    try {
      initOptions = await promptInitOptions();
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        // User cancelled
        log.info('Initialization cancelled by user');
        process.exit(0);
      }
      throw error;
    }
  }

  try {
    // Generate config file
    const configPath = generateConfigFile(initOptions, projectRoot);

    log.info(`Configuration file created successfully: ${configPath}`);

    // Update .gitignore to exclude event files and dev history
    try {
      const eventsPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.EVENTS_DIR
      );
      if (eventsPatternAdded) {
        log.info(`Added ${Paths.EVENTS_DIR} to .gitignore`);
      }

      const historyPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.DEV_HISTORY_FILE
      );
      if (historyPatternAdded) {
        log.info('Added .syrin/.dev-history to .gitignore');
      }

      const dataPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.DATA_DIR
      );
      if (dataPatternAdded) {
        log.info(`Added ${Paths.DATA_DIR} to .gitignore`);
      }
    } catch (error) {
      // Log but don't fail initialization if .gitignore update fails

      log.warn(
        `Failed to update .gitignore: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Display success message
    displayInitSuccess(configPath);
  } catch (error) {
    const configError =
      error instanceof ConfigurationError
        ? error
        : new ConfigurationError(Messages.ERROR_GENERATE_CONFIG, {
            cause: error instanceof Error ? error : new Error(String(error)),
            context: { projectRoot },
          });
    log.error(`Error: ${configError.message}`);
    throw configError;
  }
}

/**
 * Execute global init command (LLM providers only).
 * Creates ~/.syrin/syrin.yaml with LLM configuration.
 * @param options - Command options
 */
async function executeGlobalInit(options: InitCommandOptions): Promise<void> {
  // Check if global config already exists
  if (globalConfigExists()) {
    displayGlobalAlreadyInitialized();
    return;
  }

  let globalOptions: GlobalInitOptions;

  if (options.yes) {
    // Non-interactive mode: use defaults
    log.info(
      'Initializing global config with default values (non-interactive mode)'
    );
    globalOptions = getDefaultGlobalInitOptions();
  } else {
    // Interactive mode: prompt user
    log.info('Starting interactive global initialization');
    try {
      globalOptions = await promptGlobalInitOptions();
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        // User cancelled
        log.info('Global initialization cancelled by user');
        process.exit(0);
      }
      throw error;
    }
  }

  try {
    // Build GlobalSyrinConfig
    const llmConfig: GlobalSyrinConfig['llm'] = {};

    for (const [provider, settings] of Object.entries(
      globalOptions.llmProviders
    )) {
      llmConfig[provider] = {
        ...('apiKey' in settings && settings.apiKey
          ? { API_KEY: makeAPIKey(String(settings.apiKey)) }
          : {}),
        ...(settings.modelName
          ? { MODEL_NAME: makeModelName(String(settings.modelName)) }
          : {}),
        default: settings.default || false,
      };
    }

    const globalConfig: GlobalSyrinConfig = {
      version: makeSyrinVersion('1.0'),
      project_name: 'GlobalSyrin',
      agent_name: globalOptions.agentName,
      llm: llmConfig,
    };

    // Save global config
    saveGlobalConfig(globalConfig);

    const configPath = getGlobalConfigPath();
    log.info(`Global configuration file created successfully: ${configPath}`);

    // Display success message
    displayGlobalInitSuccess(configPath);
  } catch (error) {
    const configError =
      error instanceof ConfigurationError
        ? error
        : new ConfigurationError(Messages.ERROR_GENERATE_CONFIG, {
            cause: error instanceof Error ? error : new Error(String(error)),
            context: { type: 'global' },
          });
    log.error(`Error: ${configError.message}`);
    throw configError;
  }
}
