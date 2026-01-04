/**
 * Tests for `syrin update` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeUpdate } from './update';
import { checkSyrinVersion, getCurrentVersion } from '@/utils/version-checker';
import { updatePackage, detectInstallType } from '@/utils/package-manager';
import { PACKAGE_NAME } from '@/constants/app';

// Mock dependencies
vi.mock('@/utils/version-checker');
vi.mock('@/utils/package-manager');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    handleCommandError: vi.fn(error => {
      throw error;
    }),
  };
});
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
  log: {
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    blank: vi.fn(),
    plain: vi.fn(),
  },
}));

describe('executeUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when already on latest version', () => {
    it('should display already latest message and return', async () => {
      const currentVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: currentVersion,
        isLatest: true,
        updateAvailable: false,
      });

      await executeUpdate();

      expect(getCurrentVersion).toHaveBeenCalled();
      expect(checkSyrinVersion).toHaveBeenCalled();
      expect(updatePackage).not.toHaveBeenCalled();
    });
  });

  describe('when update is available', () => {
    it('should update package successfully', async () => {
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: latestVersion,
        isLatest: false,
        updateAvailable: true,
      });
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(updatePackage).mockResolvedValue({
        success: true,
        version: latestVersion,
      });

      await executeUpdate();

      expect(checkSyrinVersion).toHaveBeenCalled();
      expect(detectInstallType).toHaveBeenCalled();
      expect(updatePackage).toHaveBeenCalledWith(PACKAGE_NAME);
    });

    it('should handle local installation type', async () => {
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: latestVersion,
        isLatest: false,
        updateAvailable: true,
      });
      vi.mocked(detectInstallType).mockReturnValue('local');
      vi.mocked(updatePackage).mockResolvedValue({
        success: true,
        version: latestVersion,
      });

      await executeUpdate();

      expect(updatePackage).toHaveBeenCalledWith(PACKAGE_NAME);
    });

    it('should exit with code 1 when update fails', async () => {
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: latestVersion,
        isLatest: false,
        updateAvailable: true,
      });
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(updatePackage).mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeUpdate()).rejects.toThrow('process.exit(1)');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should handle permission errors with helpful message', async () => {
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: latestVersion,
        isLatest: false,
        updateAvailable: true,
      });
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(updatePackage).mockResolvedValue({
        success: false,
        error: 'EACCES: permission denied',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeUpdate()).rejects.toThrow('process.exit(1)');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('when version check fails', () => {
    it('should handle network errors gracefully', async () => {
      const currentVersion = '1.0.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: undefined,
        isLatest: true,
        updateAvailable: false,
      });

      await executeUpdate();

      expect(checkSyrinVersion).toHaveBeenCalled();
      expect(updatePackage).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle version check errors', async () => {
      vi.mocked(getCurrentVersion).mockReturnValue('1.0.0');
      vi.mocked(checkSyrinVersion).mockRejectedValue(
        new Error('Network error')
      );

      await expect(executeUpdate()).rejects.toThrow('Network error');
    });

    it('should handle update package errors', async () => {
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';

      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(checkSyrinVersion).mockResolvedValue({
        current: currentVersion,
        latest: latestVersion,
        isLatest: false,
        updateAvailable: true,
      });
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(updatePackage).mockRejectedValue(new Error('npm error'));

      await expect(executeUpdate()).rejects.toThrow('npm error');
    });
  });
});
