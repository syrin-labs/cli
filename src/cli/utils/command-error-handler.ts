/**
 * Command error handling utilities.
 * Provides consistent error handling patterns for CLI commands.
 */

import { logger } from '@/utils/logger';
import {
  ConfigurationError,
  normalizeError,
  getErrorMessage,
} from '@/utils/errors';
import { Icons, Messages } from '@/constants';

/**
 * Handle and display command errors with consistent formatting.
 * This ensures all commands have uniform error handling.
 *
 * @param error - The error to handle
 * @param defaultMessage - Default error message if error is not an Error instance
 * @returns Never returns (always exits process)
 */
export function handleCommandError(
  error: unknown,
  defaultMessage: string = Messages.ERROR_UNEXPECTED
): never {
  if (error instanceof ConfigurationError) {
    logger.error('Command failed', error);
    console.error(`\n${Icons.ERROR} ${error.message}\n`);
    process.exit(1);
  }

  const err = normalizeError(error);
  logger.error('Command failed', err);
  const message = getErrorMessage(error) || defaultMessage;
  console.error(`\n${Icons.ERROR} ${message}\n`);
  process.exit(1);
}
