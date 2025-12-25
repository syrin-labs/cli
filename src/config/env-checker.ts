/**
 * Environment variable checker.
 * Validates that required environment variables are set.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Messages, Paths } from '@/constants';

export interface EnvCheckResult {
  /** Whether the environment variable is set */
  isSet: boolean;
  /** The value of the environment variable (if set) */
  value?: string;
  /** Whether .env file exists */
  envFileExists: boolean;
  /** Whether the key exists in .env file */
  keyExistsInEnvFile?: boolean;
  /** Error message explaining why the variable is not set */
  errorMessage?: string;
}

/**
 * Parse .env file and return key-value pairs.
 * @param envFilePath - Path to .env file
 * @returns Map of environment variables
 */
function parseEnvFile(envFilePath: string): Map<string, string> {
  const envMap = new Map<string, string>();

  if (!fs.existsSync(envFilePath)) {
    return envMap;
  }

  try {
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1]?.trim();
        const value = match[2]?.trim() || '';
        // Remove quotes if present
        const unquotedValue = value.replace(/^["']|["']$/g, '');
        if (key) {
          envMap.set(key, unquotedValue);
        }
      }
    }
  } catch {
    // If we can't parse the file, return empty map
    // The error will be handled elsewhere
  }

  return envMap;
}

/**
 * Check if an environment variable is set.
 * Checks both process.env and .env file, providing detailed error messages.
 * @param varName - Name of the environment variable
 * @param projectRoot - Root directory of the project
 * @returns Check result with detailed error information
 */
export function checkEnvVar(
  varName: string,
  projectRoot: string = process.cwd()
): EnvCheckResult {
  const envFilePath = path.join(projectRoot, Paths.ENV_FILE);
  const envFileExists = fs.existsSync(envFilePath);

  // First check process.env (takes precedence)
  const processEnvValue = process.env[varName];
  if (processEnvValue !== undefined && processEnvValue !== '') {
    return {
      isSet: true,
      value: processEnvValue,
      envFileExists,
      keyExistsInEnvFile: undefined, // Not checked since process.env has it
    };
  }

  // If not in process.env, check .env file
  if (!envFileExists) {
    return {
      isSet: false,
      envFileExists: false,
      keyExistsInEnvFile: false,
      errorMessage: Messages.ENV_FILE_NOT_PRESENT(varName),
    };
  }

  // Parse .env file
  const envMap = parseEnvFile(envFilePath);
  const keyExistsInEnvFile = envMap.has(varName);
  const envFileValue = envMap.get(varName);

  if (!keyExistsInEnvFile) {
    return {
      isSet: false,
      envFileExists: true,
      keyExistsInEnvFile: false,
      errorMessage: Messages.ENV_KEY_NOT_FOUND(varName),
    };
  }

  if (envFileValue === '' || envFileValue === undefined) {
    return {
      isSet: false,
      value: envFileValue,
      envFileExists: true,
      keyExistsInEnvFile: true,
      errorMessage: Messages.ENV_KEY_EMPTY(varName),
    };
  }

  // Key exists and has a value
  return {
    isSet: true,
    value: envFileValue,
    envFileExists: true,
    keyExistsInEnvFile: true,
  };
}

/**
 * Check if a command exists and is executable.
 * @param command - Command to check (e.g., "python3", "node")
 * @returns true if command exists
 */
export function checkCommandExists(command: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process') as {
      execSync: (command: string, options: { stdio: 'ignore' }) => void;
    };
    // Try to find the command using 'which' or 'where' depending on platform
    if (process.platform === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract command name from a script string.
 * @param script - Script command (e.g., "python3 server.py")
 * @returns Command name (e.g., "python3")
 */
export function extractCommandName(script: string): string {
  // Remove quotes and split by space
  const cleaned = script.replace(/['"]/g, '').trim();
  const parts = cleaned.split(/\s+/);
  return parts[0] || '';
}
