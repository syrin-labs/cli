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
import { log } from '@/utils/logger';

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
      log.info(`Already on version v${normalizedVersion}`);
      log.blank();
      return;
    }

    // Verify version exists on npm registry
    log.info(
      `Verifying version v${normalizedVersion} exists on npm registry...`
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
      log.warning(
        'Could not verify version on registry (continuing anyway...)'
      );
      log.blank();
    }

    // Compare versions to warn about rolling back
    const comparison = compareVersions(currentVersion, normalizedVersion);
    if (comparison > 0) {
      log.warning(
        `Warning: Rolling back to an older version (v${currentVersion} -> v${normalizedVersion})`
      );
      log.blank();
    }

    // Determine install type for better error messages
    const installType = detectInstallType();

    log.info(
      Messages.ROLLBACK_IN_PROGRESS(`v${normalizedVersion}`, PACKAGE_NAME)
    );

    // Install the specific version
    const result = await installPackageVersion(normalizedVersion, PACKAGE_NAME);

    if (result.success) {
      const installedVersion = result.version || normalizedVersion;
      log.blank();
      log.success(
        `${Icons.CHECK} ${Messages.ROLLBACK_SUCCESS(`v${installedVersion}`)}`
      );
      log.blank();

      // Show helpful message about config compatibility
      log.info('Make sure your config.yaml is compatible with this version.');
      log.plain(`   Documentation: https://github.com/ankan-labs/syrin`);
      log.blank();
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
        log.blank();
        log.error(Messages.UPDATE_PERMISSION_HINT(sudoCommand));
        log.blank();
      } else {
        log.blank();
        log.error(Messages.ROLLBACK_ERROR(errorMessage));
        log.blank();
      }
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      log.blank();
      log.error(error.message);
      log.blank();
      process.exit(1);
      return;
    }
    handleCommandError(error, Messages.ROLLBACK_FAILED);
  }
}
