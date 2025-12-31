/**
 * `syrin update` command implementation.
 * Updates Syrin to the latest version.
 */

import { checkVersion, getCurrentVersion } from '@/utils/version-checker';
import { updatePackage, detectInstallType } from '@/utils/package-manager';
import { handleCommandError } from '@/cli/utils';
import { Messages } from '@/constants';
import { Icons } from '@/constants';

const PACKAGE_NAME = '@ankan-ai/syrin';

/**
 * Execute the update command.
 */
export async function executeUpdate(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    console.log(`${Icons.TIP} ${Messages.UPDATE_CHECKING}`);
    console.log(
      `${Icons.TIP} ${Messages.UPDATE_CURRENT_VERSION(`v${currentVersion}`)}\n`
    );

    // Check for latest version
    const versionInfo = await checkVersion(PACKAGE_NAME);

    if (!versionInfo.latest) {
      console.log(
        `${Icons.WARNING} Could not check for updates (network error or registry unavailable)`
      );
      console.log(`Current version: v${currentVersion}\n`);
      return;
    }

    if (versionInfo.isLatest) {
      console.log(
        `${Icons.CHECK} ${Messages.UPDATE_ALREADY_LATEST(`v${currentVersion}`)}\n`
      );
      return;
    }

    console.log(
      `${Icons.TIP} ${Messages.UPDATE_LATEST_VERSION(`v${versionInfo.latest}`)}\n`
    );
    console.log(`${Icons.TIP} ${Messages.UPDATE_IN_PROGRESS(PACKAGE_NAME)}`);

    // Determine install type for better error messages
    const installType = detectInstallType();

    // Update the package
    const result = await updatePackage(PACKAGE_NAME);

    if (result.success) {
      const newVersion = result.version || versionInfo.latest;
      console.log(
        `\n${Icons.CHECK} ${Messages.UPDATE_SUCCESS(`v${newVersion}`)}\n`
      );

      // Show helpful message about config migration if needed
      console.log(
        `${Icons.TIP} If your config.yaml structure changed, check the migration guide.`
      );
      console.log(`   Documentation: https://github.com/ankan-labs/syrin\n`);
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
        console.error(
          `\n${Icons.ERROR} ${Messages.UPDATE_PERMISSION_HINT(sudoCommand)}\n`
        );
      } else {
        console.error(
          `\n${Icons.ERROR} ${Messages.UPDATE_ERROR(errorMessage)}\n`
        );
      }
      process.exit(1);
    }
  } catch (error) {
    handleCommandError(error, Messages.UPDATE_FAILED);
  }
}
