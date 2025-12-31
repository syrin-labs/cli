/**
 * Version banner utility for CLI commands.
 * Displays version information at the start of commands.
 */

import { getVersionDisplayString } from '@/utils/version-display';
import { log } from '@/utils/logger';

/**
 * Display version banner for a command.
 * Shows version with update information.
 */
export async function showVersionBanner(): Promise<void> {
  try {
    const versionString = await getVersionDisplayString();
    log.label(`Syrin ${versionString}`);
    log.blank();
  } catch {
    // If version check fails, just show current version
    // This should rarely happen, but we don't want to break commands
    const { getCurrentVersion } = await import('@/utils/version-checker');
    const currentVersion = getCurrentVersion();
    log.label(`Syrin v${currentVersion}`);
    log.blank();
  }
}
