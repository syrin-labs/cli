/**
 * `syrin rollback` command implementation.
 * Rolls back Syrin to a previous version.
 */

import {
  getCurrentVersion,
  fetchPackageInfo,
  compareVersions,
} from '@/utils/version-checker';
import {
  installPackageVersion,
  isValidVersion,
  normalizeVersion,
  detectInstallType,
} from '@/utils/package-manager';
import { handleCommandError } from '@/cli/utils';
import { Messages } from '@/constants';
import { Icons } from '@/constants';
import { ConfigurationError } from '@/utils/errors';

const PACKAGE_NAME = '@ankan-ai/syrin';

export interface RollbackCommandOptions {
  version: string;
}

/**
 * Execute the rollback command.
 */
export async function executeRollback(
  options: RollbackCommandOptions
): Promise<void> {
  try {
    const { version } = options;

    // Validate version format
    if (!isValidVersion(version)) {
      throw new ConfigurationError(Messages.ROLLBACK_INVALID_VERSION(version));
    }

    const normalizedVersion = normalizeVersion(version);
    const currentVersion = getCurrentVersion();

    // Check if trying to rollback to current version
    if (normalizedVersion === currentVersion) {
      console.log(`${Icons.TIP} Already on version v${normalizedVersion}\n`);
      return;
    }

    // Verify version exists on npm registry
    console.log(
      `${Icons.TIP} Verifying version v${normalizedVersion} exists on npm registry...`
    );
    try {
      const packageInfo = await fetchPackageInfo(PACKAGE_NAME);
      if (
        !packageInfo.versions ||
        !(normalizedVersion in packageInfo.versions)
      ) {
        throw new ConfigurationError(
          Messages.ROLLBACK_VERSION_NOT_FOUND(`v${normalizedVersion}`)
        );
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      // If it's a network error, warn but continue
      console.log(
        `${Icons.WARNING} Could not verify version on registry (continuing anyway...)\n`
      );
    }

    // Compare versions to warn about rolling back
    const comparison = compareVersions(currentVersion, normalizedVersion);
    if (comparison < 0) {
      console.log(
        `${Icons.WARNING} Warning: Rolling back to an older version (${currentVersion} -> v${normalizedVersion})\n`
      );
    }

    // Determine install type for better error messages
    const installType = detectInstallType();

    console.log(
      `${Icons.TIP} ${Messages.ROLLBACK_IN_PROGRESS(`v${normalizedVersion}`, PACKAGE_NAME)}`
    );

    // Install the specific version
    const result = await installPackageVersion(normalizedVersion, PACKAGE_NAME);

    if (result.success) {
      const installedVersion = result.version || normalizedVersion;
      console.log(
        `\n${Icons.CHECK} ${Messages.ROLLBACK_SUCCESS(`v${installedVersion}`)}\n`
      );

      // Show helpful message about config compatibility
      console.log(
        `${Icons.TIP} Make sure your config.yaml is compatible with this version.`
      );
      console.log(`   Documentation: https://github.com/ankan-labs/syrin\n`);
    } else {
      const errorMessage = result.error || Messages.ROLLBACK_FAILED;

      // Check if it's a permission error
      if (
        errorMessage.includes('EACCES') ||
        errorMessage.includes('permission')
      ) {
        const sudoCommand =
          installType === 'global'
            ? `sudo npm install -g ${PACKAGE_NAME}@${normalizedVersion}`
            : `npm install ${PACKAGE_NAME}@${normalizedVersion}`;
        console.error(
          `\n${Icons.ERROR} ${Messages.UPDATE_PERMISSION_HINT(sudoCommand)}\n`
        );
      } else {
        console.error(
          `\n${Icons.ERROR} ${Messages.ROLLBACK_ERROR(errorMessage)}\n`
        );
      }
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
      return;
    }
    handleCommandError(error, Messages.ROLLBACK_FAILED);
  }
}
