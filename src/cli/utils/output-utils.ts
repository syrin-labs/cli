/**
 * Output utility functions for CLI commands.
 * Provides shared utilities for output handling and formatting.
 */

/**
 * Flush stdout to ensure all output is written before process exit.
 * This is useful for commands that exit immediately after output.
 *
 * @returns Promise that resolves when output is flushed
 */
export async function flushOutput(): Promise<void> {
  return new Promise<void>(resolve => {
    if (process.stdout.writable) {
      process.stdout.write('', () => resolve());
    } else {
      resolve();
    }
  });
}
