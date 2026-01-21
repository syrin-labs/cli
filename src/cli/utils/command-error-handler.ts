/**
 * Command error handling utilities.
 * Provides consistent error handling patterns for CLI commands.
 */

import { log } from '@/utils/logger';
import { ConfigurationError, getErrorMessage } from '@/utils/errors';
import { Messages } from '@/constants';

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
    // For user-facing errors, don't show verbose structured logs
    // The structured logger will only output in debug mode (set via setLevel)
    // For now, we skip structured logging for user-facing errors to keep output clean
    log.blank();
    log.error(error.message);
    log.blank();
    process.exit(1);
  }

  const message = getErrorMessage(error) || defaultMessage;
  log.blank();
  log.error(message);
  log.blank();
  process.exit(1);
}
