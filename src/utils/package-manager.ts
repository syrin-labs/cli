/**
 * Package management utilities.
 * Provides functions to interact with npm for updating/installing packages.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface InstallResult {
  success: boolean;
  error?: string;
  version?: string;
}

/**
 * Detect if the package is installed globally or locally.
 */
export function detectInstallType(): 'global' | 'local' {
  // Check if we're running from a global installation
  // Global npm packages are typically in:
  // - macOS/Linux: /usr/local/lib/node_modules or ~/.npm-global
  // - Windows: %APPDATA%\npm\node_modules
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const resolvedPath = fs.realpathSync(packageJsonPath);
  const nodeModulesPath = path.join(resolvedPath, '../../..');

  // Check if node_modules parent is a global location
  if (
    nodeModulesPath.includes('node_modules') &&
    (nodeModulesPath.includes('npm') ||
      nodeModulesPath.includes('.npm-global') ||
      nodeModulesPath.startsWith('/usr/local') ||
      nodeModulesPath.startsWith('/opt'))
  ) {
    return 'global';
  }

  return 'local';
}

/**
 * Execute npm command and return result.
 */
function executeNpmCommand(
  args: string[],
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', args, {
      cwd: cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    npm.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    npm.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    npm.on('close', code => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        resolve({ success: false, stdout, stderr });
      }
    });

    npm.on('error', error => {
      reject(error);
    });
  });
}

/**
 * Update package to latest version.
 */
export async function updatePackage(
  packageName: string = '@ankan-ai/syrin'
): Promise<InstallResult> {
  const installType = detectInstallType();
  const args =
    installType === 'global'
      ? ['install', '-g', `${packageName}@latest`]
      : ['install', `${packageName}@latest`];

  try {
    const result = await executeNpmCommand(args);

    if (result.success) {
      // Try to get the installed version from package.json
      const packageJsonPath = path.join(__dirname, '../../package.json');
      let version: string | undefined;

      try {
        if (fs.existsSync(packageJsonPath)) {
          const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent) as {
            version?: string;
          };
          version = packageJson.version;
        }
      } catch {
        // Ignore errors reading version
      }

      return {
        success: true,
        version,
      };
    }

    return {
      success: false,
      error: result.stderr || 'Update failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Install a specific version of the package.
 */
export async function installPackageVersion(
  version: string,
  packageName: string = '@ankan-ai/syrin'
): Promise<InstallResult> {
  const installType = detectInstallType();
  const args =
    installType === 'global'
      ? ['install', '-g', `${packageName}@${version}`]
      : ['install', `${packageName}@${version}`];

  try {
    const result = await executeNpmCommand(args);

    if (result.success) {
      // Try to get the installed version from package.json
      const packageJsonPath = path.join(__dirname, '../../package.json');
      let installedVersion: string | undefined;

      try {
        if (fs.existsSync(packageJsonPath)) {
          const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent) as {
            version?: string;
          };
          installedVersion = packageJson.version;
        }
      } catch {
        // Ignore errors reading version
      }

      return {
        success: true,
        version: installedVersion || version,
      };
    }

    return {
      success: false,
      error: result.stderr || 'Installation failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate version string format.
 */
export function isValidVersion(version: string): boolean {
  // Basic semver validation: major.minor.patch or vmajor.minor.patch
  const semverPattern = /^v?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
  return semverPattern.test(version);
}

/**
 * Normalize version string (remove 'v' prefix if present).
 */
export function normalizeVersion(version: string): string {
  return version.replace(/^v/, '');
}
