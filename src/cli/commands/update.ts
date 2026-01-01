/**
 * `syrin update` command implementation.
 * Updates Syrin to the latest version.
 */

import { checkSyrinVersion, getCurrentVersion } from '@/utils/version-checker';
import { updatePackage, detectInstallType } from '@/utils/package-manager';
import { handleCommandError } from '@/cli/utils';
import { Messages } from '@/constants';
import { Icons } from '@/constants';
import { SYRIN_LINKS } from '@/constants/links';
import { log } from '@/utils/logger';
import { PACKAGE_NAME } from '@/constants/app';

/**
 * Execute the update command.
 */
export async function executeUpdate(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    log.info(Messages.UPDATE_CHECKING);
    log.info(Messages.UPDATE_CURRENT_VERSION(`v${currentVersion}`));
    log.blank();

    // Check for latest version
    const versionInfo = await checkSyrinVersion();

    if (!versionInfo.latest) {
      log.warning(
        'Could not check for updates (network error or registry unavailable)'
      );
      log.plain(`Current version: v${currentVersion}`);
      log.blank();
      return;
    }

    if (versionInfo.isLatest) {
      log.success(Messages.UPDATE_ALREADY_LATEST(`v${currentVersion}`));
      log.blank();
      return;
    }

    log.info(Messages.UPDATE_LATEST_VERSION(`v${versionInfo.latest}`));
    log.blank();
    log.info(Messages.UPDATE_IN_PROGRESS(PACKAGE_NAME));

    // Determine install type for better error messages
    const installType = detectInstallType();

    // Update the package
    const result = await updatePackage(PACKAGE_NAME);

    if (result.success) {
      const newVersion = result.version || versionInfo.latest;
      log.blank();
      log.success(
        `${Icons.CHECK} ${Messages.UPDATE_SUCCESS(`v${newVersion}`)}`
      );
      log.blank();

      // Show helpful message about config migration if needed
      log.info(
        'If your config.yaml structure changed, check the migration guide.'
      );
      log.plain(`   Documentation: ${SYRIN_LINKS.DOCS}`);
      log.blank();
    } else {
      const errorMessage = result.error || Messages.UPDATE_FAILED;

      // Check if it's a permission error
      if (
        errorMessage.includes('EACCES') ||
        errorMessage.includes('permission')
      ) {
        const sudoCommand =
          installType === 'global'
            ? `sudo npm install -g ${PACKAGE_NAME}@latest`
            : `npm install ${PACKAGE_NAME}@latest`;
        log.blank();
        log.error(Messages.UPDATE_PERMISSION_HINT(sudoCommand));
        log.blank();
      } else {
        log.blank();
        log.error(Messages.UPDATE_ERROR(errorMessage));
        log.blank();
      }
      process.exit(1);
    }
  } catch (error) {
    handleCommandError(error, Messages.UPDATE_FAILED);
  }
}
