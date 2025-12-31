/**
 * Version banner utility for CLI commands.
 * Displays version information at the start of commands.
 */

import { getVersionDisplayString } from '@/utils/version-display';

/**
 * Display version banner for a command.
 * Shows version with update information.
 */
export async function showVersionBanner(): Promise<void> {
  try {
    const versionString = await getVersionDisplayString();
    console.log(`Syrin ${versionString}\n`);
  } catch {
    // If version check fails, just show current version
    // This should rarely happen, but we don't want to break commands
    const { getCurrentVersion } = await import('@/utils/version-checker');
    const currentVersion = getCurrentVersion();
    console.log(`Syrin v${currentVersion}\n`);
  }
}
