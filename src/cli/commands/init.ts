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
  const configDir = path.join(projectRoot, '.syrin');

  // Check if project is already initialized
  if (isProjectInitialized(projectRoot)) {
    console.log('\n⚠️  Syrin project is already initialized!\n');
    console.log('📁 Configuration file: .syrin/config.yaml\n');
    console.log('📝 Next steps:');
    console.log(
      '   Syrin is already initialized. Kindly go to .syrin/config.yaml to set up.'
    );
    console.log(
      '   After the setup, you can call `syrin inspect` to verify the setup process.\n'
    );
    console.log('💡 Want to re-initialize?');
    console.log('   Delete the .syrin directory and run `syrin init` again.\n');

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

    // Display success message
    console.log('\n✅ Syrin project initialized successfully!');
    console.log(`\n📁 Configuration file: ${configPath}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review and edit .syrin/config.yaml if needed');
    console.log('   2. Set up your environment variables (API keys, etc.)');
    console.log('   3. Run `syrin inspect` to verify your Syrin setup');
    console.log('   4. Run `syrin dev` to start development mode\n');
  } catch (error) {
    const configError =
      error instanceof ConfigurationError
        ? error
        : new ConfigurationError('Failed to generate configuration file', {
            cause: error instanceof Error ? error : new Error(String(error)),
            context: { projectRoot, configDir },
          });
    logger.error('Failed to initialize project', configError);
    throw configError;
  }
}
