/**
 * Presentation utilities for init command.
 * Separates UI/logic concerns by providing functions for displaying messages.
 */

import { Icons, Messages, Paths, Commands } from '@/constants';

/**
 * Display the "already initialized" message.
 */
export function displayAlreadyInitialized(): void {
  console.log(`\n${Icons.WARNING}  ${Messages.INIT_ALREADY_INITIALIZED}\n`);
  console.log(
    `${Icons.FOLDER} ${Messages.INIT_CONFIG_FILE(Paths.CONFIG_PATH)}\n`
  );
  console.log(`${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
  console.log(`   ${Messages.INIT_ALREADY_INIT_MSG(Paths.CONFIG_PATH)}`);
  console.log(`   ${Messages.INIT_VERIFY_SETUP(Commands.DOCTOR)}\n`);
  console.log(`${Icons.TIP} ${Messages.INIT_REINITIALIZE_TIP}`);
  console.log(`   ${Messages.INIT_REINITIALIZE_INSTRUCTION(Commands.INIT)}\n`);
}

/**
 * Display the initialization success message.
 * @param configPath - Path to the created config file
 */
export function displayInitSuccess(configPath: string): void {
  console.log(`\n${Icons.CHECK} ${Messages.INIT_SUCCESS}`);
  console.log(`\n${Icons.FOLDER} Configuration file: ${configPath}`);
  console.log(`\n${Icons.DOCUMENT} ${Messages.INIT_NEXT_STEPS_HEADER}`);
  console.log(`   1. ${Messages.INIT_REVIEW_CONFIG(Paths.CONFIG_PATH)}`);
  console.log(`   2. ${Messages.INIT_SETUP_ENV_VARS}`);
  console.log(`   3. ${Messages.INIT_RUN_DOCTOR(Commands.DOCTOR)}`);
  console.log(`   4. ${Messages.INIT_RUN_DEV(Commands.DEV)}\n`);
}
