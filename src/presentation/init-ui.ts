/**
 * Presentation utilities for init command.
 * Separates UI/logic concerns by providing functions for displaying messages.
 */

import { Icons, Messages, Paths, Commands } from '@/constants';
import { log } from '@/utils/logger';

/**
 * Display the "already initialized" message.
 */
export function displayAlreadyInitialized(): void {
  log.blank();
  log.warning(`  ${Messages.INIT_ALREADY_INITIALIZED}`);
  log.blank();
  log.plain(`${Icons.FOLDER} ${Messages.INIT_CONFIG_FILE(Paths.CONFIG_PATH)}`);
  log.blank();
  log.plain(`${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
  log.plain(`   ${Messages.INIT_ALREADY_INIT_MSG(Paths.CONFIG_PATH)}`);
  log.plain(`   ${Messages.INIT_VERIFY_SETUP(Commands.DOCTOR)}`);
  log.blank();
  log.info(Messages.INIT_REINITIALIZE_TIP);
  log.plain(`   ${Messages.INIT_REINITIALIZE_INSTRUCTION(Commands.INIT)}`);
  log.blank();
}

/**
 * Display the initialization success message.
 * @param configPath - Path to the created config file
 */
export function displayInitSuccess(configPath: string): void {
  log.blank();
  log.success(`${Icons.CHECK} ${Messages.INIT_SUCCESS}`);
  log.blank();
  log.plain(`${Icons.FOLDER} Configuration file: ${configPath}`);
  log.blank();
  log.plain(`${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
  log.plain(`   1. ${Messages.INIT_REVIEW_CONFIG(Paths.CONFIG_PATH)}`);
  log.plain(`   2. ${Messages.INIT_SETUP_ENV_VARS}`);
  log.plain(`   3. ${Messages.INIT_RUN_DOCTOR(Commands.DOCTOR)}`);
  log.plain(`   4. ${Messages.INIT_RUN_DEV(Commands.DEV)}`);
  log.blank();
}
