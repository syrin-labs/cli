/**
 * Version checking utilities.
 * Provides functions to check current version and compare with npm registry.
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { PACKAGE_NAME } from '@/constants/app';

export interface VersionInfo {
  current: string;
  latest?: string;
  isLatest: boolean;
  updateAvailable: boolean;
}

export interface RegistryPackageInfo {
  'dist-tags': {
    latest: string;
  };
  versions: Record<string, unknown>;
}

/**
 * Get the current version from package.json.
 */
export function getCurrentVersion(): string {
  try {
    // Try to read from installed package location
    const packageJsonPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as {
        version?: string;
      };
      return packageJson.version || '1.0.0';
    }
  } catch {
    // Fallback if package.json cannot be read
  }
  return '1.0.0';
}

/**
 * Fetch package information from npm registry.
 */
export async function fetchPackageInfo(
  packageName: string = PACKAGE_NAME
): Promise<RegistryPackageInfo> {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}`;
    const TIMEOUT_MS = 5000; // 5 seconds

    const request = https.get(url, res => {
      // Validate status code before processing response
      if (res.statusCode !== 200) {
        request.destroy();
        reject(
          new Error(
            `npm registry request failed with status ${res.statusCode} ${res.statusMessage || 'Unknown'}`
          )
        );
        return;
      }

      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const packageInfo = JSON.parse(data) as RegistryPackageInfo;
          resolve(packageInfo);
        } catch (error) {
          reject(
            new Error(`Failed to parse npm registry response: ${String(error)}`)
          );
        }
      });
    });

    // Handle request errors
    request.on('error', error => {
      request.destroy();
      reject(new Error(`Failed to fetch from npm registry: ${error.message}`));
    });

    // Set socket timeout to prevent hanging requests
    request.on('socket', socket => {
      socket.setTimeout(TIMEOUT_MS, () => {
        request.destroy();
        reject(
          new Error(`npm registry request timed out after ${TIMEOUT_MS}ms`)
        );
      });
    });
  });
}

/**
 * Get the latest version from npm registry.
 */
export async function getLatestVersion(
  packageName: string = PACKAGE_NAME
): Promise<string | undefined> {
  try {
    const packageInfo = await fetchPackageInfo(packageName);
    return packageInfo['dist-tags']?.latest;
  } catch {
    // Return undefined if check fails (offline, network error, etc.)
    return undefined;
  }
}

/**
 * Compare two version strings using simple semantic version comparison.
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  let cleanV1 = v1.replace(/^v/, '');
  let cleanV2 = v2.replace(/^v/, '');

  // Strip prerelease and build metadata (remove everything from first '-' or '+' onward)
  cleanV1 = cleanV1.split(/[-+]/)[0]!;
  cleanV2 = cleanV2.split(/[-+]/)[0]!;

  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);

  // Ensure both have 3 parts (major.minor.patch)
  while (parts1.length < 3) parts1.push(0);
  while (parts2.length < 3) parts2.push(0);

  for (let i = 0; i < 3; i++) {
    if (parts1[i]! < parts2[i]!) return -1;
    if (parts1[i]! > parts2[i]!) return 1;
  }

  return 0;
}

/**
 * Check Syrin version information including update availability.
 */
export async function checkSyrinVersion(): Promise<VersionInfo> {
  const current = getCurrentVersion();
  const latest = await getLatestVersion(PACKAGE_NAME);

  if (!latest) {
    // If we can't fetch latest version, assume current is latest
    return {
      current,
      isLatest: true,
      updateAvailable: false,
    };
  }

  const comparison = compareVersions(current, latest);
  const isLatest = comparison >= 0;
  const updateAvailable = comparison < 0;

  return {
    current,
    latest,
    isLatest,
    updateAvailable,
  };
}

/**
 * Check version information including update availability.
 * @deprecated Use checkSyrinVersion() instead. This function is kept for backward compatibility.
 */
export async function checkVersion(
  packageName: string = PACKAGE_NAME
): Promise<VersionInfo> {
  const current = getCurrentVersion();
  const latest = await getLatestVersion(packageName);

  if (!latest) {
    // If we can't fetch latest version, assume current is latest
    return {
      current,
      isLatest: true,
      updateAvailable: false,
    };
  }

  const comparison = compareVersions(current, latest);
  const isLatest = comparison >= 0;
  const updateAvailable = comparison < 0;

  return {
    current,
    latest,
    isLatest,
    updateAvailable,
  };
}

/**
 * Format version string with update information.
 */
export function formatVersionWithUpdate(
  versionInfo: VersionInfo,
  packageName: string = PACKAGE_NAME
): string {
  const version = `v${versionInfo.current}`;
  if (versionInfo.isLatest || !versionInfo.latest) {
    return `${version} (latest)`;
  }
  if (versionInfo.updateAvailable && versionInfo.latest) {
    return `${version} (update to v${versionInfo.latest}, using: npm update -g ${packageName})`;
  }
  return version;
}
