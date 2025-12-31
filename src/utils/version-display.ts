/**
 * Version display utilities for CLI commands.
 * Provides functions for displaying version information with update hints.
 */

import { checkVersion } from './version-checker';

const PACKAGE_NAME = '@ankan-ai/syrin';

/**
 * Get formatted version string with update information.
 * Returns format: "v1.0.0 (latest)" or "v1.0.0 (update available: v1.1.0, run: syrin update)"
 */
export async function getVersionDisplayString(
  packageName: string = PACKAGE_NAME
): Promise<string> {
  const versionInfo = await checkVersion(packageName);

  if (versionInfo.isLatest || !versionInfo.latest) {
    return `v${versionInfo.current} (latest)`;
  }

  if (versionInfo.updateAvailable && versionInfo.latest) {
    return `v${versionInfo.current} (update available: v${versionInfo.latest}, run: syrin update)`;
  }

  return `v${versionInfo.current}`;
}
