/**
 * Tests for `syrin rollback` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeRollback } from './rollback';
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
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    plain: vi.fn(),
    blank: vi.fn(),
    heading: vi.fn(),
    label: vi.fn(),
    value: vi.fn(),
    labelValue: vi.fn(),
    numberedItem: vi.fn(),
    checkmark: vi.fn(),
    xmark: vi.fn(),
    warnSymbol: vi.fn(),
    tick: vi.fn(() => '✓'),
    cross: vi.fn(() => '✗'),
    styleText: vi.fn(text => text),
  },
}));

describe('executeRollback', () => {
  let exitSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (exitSpy) {
      exitSpy.mockRestore();
      exitSpy = null;
    }
  });

  describe('version validation', () => {
    it('should reject invalid version format', async () => {
      vi.mocked(isValidVersion).mockReturnValue(false);

      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(
        executeRollback({ version: 'invalid-version' })
      ).rejects.toThrow('process.exit(1)');

      expect(isValidVersion).toHaveBeenCalledWith('invalid-version');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should accept valid version formats', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(isValidVersion).toHaveBeenCalledWith(version);
      expect(normalizeVersion).toHaveBeenCalledWith(version);
    });

    it('should normalize version with v prefix', async () => {
      const version = 'v1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(normalizeVersion).toHaveBeenCalledWith(version);
    });
  });

  describe('when rolling back to current version', () => {
    it('should inform user and return early', async () => {
      const version = '1.1.0';
      const normalizedVersion = '1.1.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);

      await executeRollback({ version });

      expect(installPackageVersion).not.toHaveBeenCalled();
    });
  });

  describe('version verification', () => {
    it('should verify version exists on npm registry', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(fetchPackageInfo).toHaveBeenCalledWith(PACKAGE_NAME);
    });

    it('should throw error if version not found on registry', async () => {
      const version = '0.9.0';
      const normalizedVersion = '0.9.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeRollback({ version })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should continue with warning if registry check fails', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockRejectedValue(new Error('Network error'));
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      // Should continue despite registry check failure
      expect(installPackageVersion).toHaveBeenCalledWith(
        normalizedVersion,
        PACKAGE_NAME
      );
    });
  });

  describe('version comparison', () => {
    it('should warn when rolling back to older version', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1); // current > target
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(compareVersions).toHaveBeenCalledWith(
        currentVersion,
        normalizedVersion
      );
    });

    it('should not warn when rolling forward', async () => {
      const version = '1.2.0';
      const normalizedVersion = '1.2.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.2.0' },
        versions: { '1.1.0': {}, '1.2.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(-1); // current < target
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(compareVersions).toHaveBeenCalledWith(
        currentVersion,
        normalizedVersion
      );
    });
  });

  describe('successful rollback', () => {
    it('should install specific version successfully', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(installPackageVersion).toHaveBeenCalledWith(
        normalizedVersion,
        PACKAGE_NAME
      );
    });

    it('should handle local installation type', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('local');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: true,
        version: normalizedVersion,
      });

      await executeRollback({ version });

      expect(installPackageVersion).toHaveBeenCalledWith(
        normalizedVersion,
        PACKAGE_NAME
      );
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 when installation fails', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: false,
        error: 'Installation failed',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeRollback({ version })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should handle permission errors', async () => {
      const version = '1.0.0';
      const normalizedVersion = '1.0.0';
      const currentVersion = '1.1.0';

      vi.mocked(isValidVersion).mockReturnValue(true);
      vi.mocked(normalizeVersion).mockReturnValue(normalizedVersion);
      vi.mocked(getCurrentVersion).mockReturnValue(currentVersion);
      vi.mocked(fetchPackageInfo).mockResolvedValue({
        'dist-tags': { latest: '1.1.0' },
        versions: { '1.0.0': {}, '1.1.0': {} },
      });
      vi.mocked(compareVersions).mockReturnValue(1);
      vi.mocked(detectInstallType).mockReturnValue('global');
      vi.mocked(installPackageVersion).mockResolvedValue({
        success: false,
        error: 'EACCES: permission denied',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeRollback({ version })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should handle ConfigurationError and exit with code 1', async () => {
      const version = 'invalid';

      vi.mocked(isValidVersion).mockReturnValue(false);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeRollback({ version })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });
});
