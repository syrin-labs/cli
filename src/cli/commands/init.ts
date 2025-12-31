/**
 * `syrin init` command implementation.
 * Initializes a new Syrin project with configuration.
 */

import * as path from 'path';
import { generateConfigFile, isProjectInitialized } from '@/config/generator';
import {
  promptInitOptions,
  getDefaultInitOptions,
} from '@/cli/prompts/init-prompt';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { InitOptions } from '@/config/types';
import { Messages, Paths } from '@/constants';
import { ensureGitignorePattern } from '@/utils/gitignore';
import {
  displayAlreadyInitialized,
  displayInitSuccess,
} from '@/presentation/init-ui';
import { showVersionBanner } from '@/cli/utils/version-banner';

export interface InitCommandOptions {
  /** Skip interactive prompts, use defaults */
  yes?: boolean;
  /** Project root directory (defaults to current working directory) */
  projectRoot?: string;
}

/**
 * Execute the init command.
 * @param options - Command options
 */
export async function executeInit(
  options: InitCommandOptions = {}
): Promise<void> {
  await showVersionBanner();
  const projectRoot = options.projectRoot || process.cwd();
  const configDir = path.join(projectRoot, Paths.SYRIN_DIR);

  // Check if project is already initialized
  if (isProjectInitialized(projectRoot)) {
    displayAlreadyInitialized();
    // Exit gracefully without showing error stack
    return;
  }

  let initOptions: InitOptions;

  if (options.yes) {
    // Non-interactive mode: use defaults
    logger.info(
      'Initializing project with default values (non-interactive mode)'
    );
    initOptions = getDefaultInitOptions(projectRoot);
  } else {
    // Interactive mode: prompt user
    logger.info('Starting interactive project initialization');
    try {
      initOptions = await promptInitOptions();
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        // User cancelled
        logger.info('Initialization cancelled by user');
        process.exit(0);
      }
      throw error;
    }
  }

  try {
    // Generate config file
    const configPath = generateConfigFile(initOptions, configDir);

    logger.info('Configuration file created successfully', {
      configPath,
      projectName: initOptions.projectName,
      transport: initOptions.transport,
    });

    // Update .gitignore to exclude event files and dev history
    try {
      const eventsPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.EVENTS_DIR
      );
      if (eventsPatternAdded) {
        logger.info(`Added ${Paths.EVENTS_DIR} to .gitignore`);
      }

      const historyPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.DEV_HISTORY_FILE
      );
      if (historyPatternAdded) {
        logger.info('Added .syrin/.dev-history to .gitignore');
      }

      const dataPatternAdded = await ensureGitignorePattern(
        projectRoot,
        Paths.DATA_DIR
      );
      if (dataPatternAdded) {
        logger.info(`Added ${Paths.DATA_DIR} to .gitignore`);
      }
    } catch (error) {
      // Log but don't fail initialization if .gitignore update fails

      logger.warn('Failed to update .gitignore', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Display success message
    displayInitSuccess(configPath);
  } catch (error) {
    const configError =
      error instanceof ConfigurationError
        ? error
        : new ConfigurationError(Messages.ERROR_GENERATE_CONFIG, {
            cause: error instanceof Error ? error : new Error(String(error)),
            context: { projectRoot, configDir },
          });
    logger.error('Failed to initialize project', configError);
    throw configError;
  }
}
