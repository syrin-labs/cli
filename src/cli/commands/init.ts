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
import { Icons, Messages, Paths, Commands } from '@/constants';
import { ensureGitignorePattern } from '@/utils/gitignore';

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
  const projectRoot = options.projectRoot || process.cwd();
  const configDir = path.join(projectRoot, Paths.SYRIN_DIR);

  // Check if project is already initialized
  if (isProjectInitialized(projectRoot)) {
    console.log(`\n${Icons.WARNING}  ${Messages.INIT_ALREADY_INITIALIZED}\n`);
    console.log(
      `${Icons.FOLDER} ${Messages.INIT_CONFIG_FILE(Paths.CONFIG_PATH)}\n`
    );
    console.log(`${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
    console.log(`   ${Messages.INIT_ALREADY_INIT_MSG(Paths.CONFIG_PATH)}`);
    console.log(`   ${Messages.INIT_VERIFY_SETUP(Commands.DOCTOR)}\n`);
    console.log(`${Icons.TIP} ${Messages.INIT_REINITIALIZE_TIP}`);
    console.log(
      `   ${Messages.INIT_REINITIALIZE_INSTRUCTION(Commands.INIT)}\n`
    );

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
        '.syrin/events'
      );
      if (eventsPatternAdded) {
        logger.info('Added .syrin/events to .gitignore');
      }

      const historyPatternAdded = await ensureGitignorePattern(
        projectRoot,
        '.syrin/.dev-history'
      );
      if (historyPatternAdded) {
        logger.info('Added .syrin/.dev-history to .gitignore');
      }
    } catch (error) {
      // Log but don't fail initialization if .gitignore update fails
      logger.warn('Failed to update .gitignore', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Display success message
    console.log(`\n${Icons.CHECK} ${Messages.INIT_SUCCESS}`);
    console.log(`\n${Icons.FOLDER} Configuration file: ${configPath}`);
    console.log(`\n${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
    console.log(`   1. ${Messages.INIT_REVIEW_CONFIG(Paths.CONFIG_PATH)}`);
    console.log(`   2. ${Messages.INIT_SETUP_ENV_VARS}`);
    console.log(`   3. ${Messages.INIT_RUN_DOCTOR(Commands.DOCTOR)}`);
    console.log(`   4. ${Messages.INIT_RUN_DEV(Commands.DEV)}\n`);
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
