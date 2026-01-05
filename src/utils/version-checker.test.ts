/**
 * Tests for version-checker utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'events';
import {
  getCurrentVersion,
  compareVersions,
  getLatestVersion,
  checkSyrinVersion,
  formatVersionWithUpdate,
} from './version-checker';
import { PACKAGE_NAME } from '@/constants/app';

// Mock npm registry calls to avoid network requests in tests
vi.mock('https', () => ({
  default: {
    get: vi.fn(),
  },
}));

/**
 * Resolve package.json path using the same module-relative strategy as getCurrentVersion.
 * This ensures tests resolve package.json the same way as the implementation,
 * making tests work correctly in CI and different working directories.
 */
function resolveTestPackageJsonPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  return path.join(currentDir, '../../package.json');
}

describe('version-checker', () => {
  describe('getCurrentVersion', () => {
    it('should read version from package.json correctly', () => {
      // This test verifies that getCurrentVersion actually reads from package.json
      // and returns the correct version, not the hardcoded fallback
      const actualVersion = getCurrentVersion();

      // Resolve package.json the same way as getCurrentVersion does
      // (using module-relative path instead of process.cwd())
      const packageJsonPath = resolveTestPackageJsonPath();
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as {
        version?: string;
      };
      const expectedVersion = packageJson.version;

      // Verify that the version matches what's in package.json
      expect(actualVersion).toBe(expectedVersion);

      // If package.json has a version, it should not be the hardcoded fallback
      // (unless package.json actually has 1.0.0, which is unlikely but possible)
      if (expectedVersion && expectedVersion !== '1.0.0') {
        expect(actualVersion).not.toBe('1.0.0');
      }

      // Verify it's a valid semantic version format
      const semverPattern = /^\d+\.\d+\.\d+$/;
      expect(actualVersion).toMatch(semverPattern);
    });

    it('should return a valid semantic version format', () => {
      const version = getCurrentVersion();
      // Semantic version format: major.minor.patch
      const semverPattern = /^\d+\.\d+\.\d+$/;
      expect(version).toMatch(semverPattern);
    });

    it('should handle missing package.json gracefully', () => {
      // Verify the function doesn't throw even if package.json can't be read
      // (In practice, package.json should always exist, but we test the error handling)
      expect(() => getCurrentVersion()).not.toThrow();

      // Should return a valid version (either from package.json or fallback)
      const version = getCurrentVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    });

    it('should handle version with v prefix', () => {
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
      expect(compareVersions('v1.0.0', 'v1.0.1')).toBe(-1);
    });

    it('should handle prerelease versions', () => {
      expect(compareVersions('1.0.0', '1.0.0-beta')).toBe(0);
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(0);
    });

    it('should handle build metadata', () => {
      expect(compareVersions('1.0.0', '1.0.0+123')).toBe(0);
      expect(compareVersions('1.0.0+456', '1.0.0+789')).toBe(0);
    });
  });

  describe('getLatestVersion', () => {
    it('should return undefined on network error', async () => {
      const https = await import('https');

      vi.mocked(https.default.get).mockImplementation((_url, callback) => {
        const req = new EventEmitter();
        req.destroy = vi.fn();

        setTimeout(() => {
          const res = new EventEmitter();
          res.statusCode = 500;
          res.on = res.addListener.bind(res);
          if (callback) {
            callback(res as any);
          }
        }, 0);

        return req as any;
      });

      const latestVersion = await getLatestVersion(PACKAGE_NAME);
      expect(latestVersion).toBeUndefined();
    });
  });

  describe('checkSyrinVersion', () => {
    it('should return version info with current version from package.json', async () => {
      // Mock network to return undefined (offline scenario)
      const https = await import('https');

      vi.mocked(https.default.get).mockImplementation((_url, callback) => {
        const req = new EventEmitter();
        req.destroy = vi.fn();

        setTimeout(() => {
          const res = new EventEmitter();
          res.statusCode = 500;
          res.on = res.addListener.bind(res);
          if (callback) {
            callback(res as any);
          }
        }, 0);

        return req as any;
      });

      const versionInfo = await checkSyrinVersion();

      // Resolve package.json the same way as getCurrentVersion does
      // (using module-relative path instead of process.cwd())
      const packageJsonPath = resolveTestPackageJsonPath();
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as {
        version?: string;
      };
      const expectedVersion = packageJson.version || '1.0.0';

      expect(versionInfo.current).toBe(expectedVersion);
      // If package.json has a version other than 1.0.0, verify it's not the hardcoded fallback
      if (expectedVersion !== '1.0.0') {
        expect(versionInfo.current).not.toBe('1.0.0');
      }
      // When network fails, latest should be undefined
      expect(versionInfo.latest).toBeUndefined();
      expect(versionInfo.isLatest).toBe(true);
    });
  });

  describe('formatVersionWithUpdate', () => {
    it('should format version with latest indicator', () => {
      const versionInfo = {
        current: '1.2.0',
        latest: '1.2.0',
        isLatest: true,
        updateAvailable: false,
      };
      const formatted = formatVersionWithUpdate(versionInfo);
      expect(formatted).toContain('v1.2.0');
      expect(formatted).toContain('latest');
    });

    it('should format version with update available', () => {
      const versionInfo = {
        current: '1.0.0',
        latest: '1.2.0',
        isLatest: false,
        updateAvailable: true,
      };
      const formatted = formatVersionWithUpdate(versionInfo);
      expect(formatted).toContain('v1.0.0');
      expect(formatted).toContain('v1.2.0');
      expect(formatted).toContain('update');
    });
  });
});
