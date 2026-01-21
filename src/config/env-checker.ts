/**
 * Environment variable checker.
 * Validates that required environment variables are set.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Messages, Paths } from '@/constants';
import { getGlobalEnvPath } from './global-loader';

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
  /** Source of the environment variable: 'process.env' | 'global.env' | 'local.env' */
  source?: 'process.env' | 'global.env' | 'local.env';
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
 * Load global environment file.
 * @returns Map of environment variables from ~/.syrin/.env
 */
export function loadGlobalEnvFile(): Map<string, string> {
  const globalEnvPath = getGlobalEnvPath();
  return parseEnvFile(globalEnvPath);
}

/**
 * Check if an environment variable is set.
 * Checks in order:
 *   - For local context: process.env > local .env > global .env
 *   - For global context: process.env > global .env
 * @param varName - Name of the environment variable
 * @param projectRoot - Root directory of the project
 * @param isGlobalContext - Whether this check is for global config (affects check order and error messages)
 * @returns Check result with detailed error information
 */
export function checkEnvVar(
  varName: string,
  projectRoot: string = process.cwd(),
  isGlobalContext: boolean = false
): EnvCheckResult {
  const localEnvFilePath = path.join(projectRoot, Paths.ENV_FILE);
  const globalEnvPath = getGlobalEnvPath();
  const localEnvFileExists = fs.existsSync(localEnvFilePath);
  const globalEnvFileExists = fs.existsSync(globalEnvPath);

  // First check process.env (takes precedence)
  const processEnvValue = process.env[varName];
  if (processEnvValue !== undefined && processEnvValue !== '') {
    return {
      isSet: true,
      value: processEnvValue,
      envFileExists: localEnvFileExists || globalEnvFileExists,
      keyExistsInEnvFile: undefined,
      source: 'process.env',
    };
  }

  // For local context: check local .env first, then global .env
  // For global context: check global .env only
  if (!isGlobalContext && localEnvFileExists) {
    const localEnvMap = parseEnvFile(localEnvFilePath);
    const keyExistsInLocalEnv = localEnvMap.has(varName);
    const localEnvValue = localEnvMap.get(varName);

    if (keyExistsInLocalEnv) {
      if (localEnvValue === '' || localEnvValue === undefined) {
        return {
          isSet: false,
          value: localEnvValue,
          envFileExists: true,
          keyExistsInEnvFile: true,
          errorMessage: Messages.ENV_KEY_EMPTY(varName),
          source: 'local.env',
        };
      }

      return {
        isSet: true,
        value: localEnvValue,
        envFileExists: true,
        keyExistsInEnvFile: true,
        source: 'local.env',
      };
    }
  }

  // Check global .env file (fallback for local context, primary for global context)
  if (globalEnvFileExists) {
    const globalEnvMap = parseEnvFile(globalEnvPath);
    const keyExistsInGlobalEnv = globalEnvMap.has(varName);
    const globalEnvValue = globalEnvMap.get(varName);

    if (keyExistsInGlobalEnv) {
      if (globalEnvValue === '') {
        return {
          isSet: false,
          envFileExists: true,
          keyExistsInEnvFile: true,
          source: 'global.env',
          errorMessage: Messages.ENV_SET_INSTRUCTIONS(varName),
        };
      }
      return {
        isSet: true,
        value: globalEnvValue,
        envFileExists: true,
        keyExistsInEnvFile: true,
        source: 'global.env',
      };
    }
  }

  // Variable not found in any source
  // Generate appropriate error message based on context
  let errorMessage: string;
  if (isGlobalContext) {
    // For global config, suggest global .env or environment variables
    if (globalEnvFileExists) {
      errorMessage = `Key "${varName}" not found in ${globalEnvPath} or environment variables`;
    } else {
      errorMessage = `Global .env file not found at ${globalEnvPath}. Create it with: syrin config edit-env --global`;
    }
  } else {
    // For local config, use original message
    errorMessage = Messages.ENV_FILE_NOT_PRESENT(varName);
  }

  return {
    isSet: false,
    envFileExists: localEnvFileExists || globalEnvFileExists,
    keyExistsInEnvFile: false,
    errorMessage,
  };
}

/**
 * Check if a command exists and is executable.
 * @param command - Command to check (e.g., "python3", "node")
 * @returns true if command exists
 */
export function checkCommandExists(command: string): boolean {
  try {
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
