/**
 * Configuration file loader.
 * Loads and parses the syrin.yaml file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { validateConfig } from './schema';
import { ConfigurationError } from '@/utils/errors';
import type { SyrinConfig } from './types';
import { Paths, Messages, ToolCommands } from '@/constants';

/**
 * Load configuration from syrin.yaml file.
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @returns Loaded and validated configuration
 * @throws {ConfigurationError} If config file is missing or invalid
 */
export function loadConfig(projectRoot: string = process.cwd()): SyrinConfig {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    throw new ConfigurationError(
      Messages.ERROR_CONFIG_NOT_FOUND(ToolCommands.INIT),
      {
        context: { projectRoot, configPath },
      }
    );
  }

  try {
    // Read and parse YAML file
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const configData = load(configContent);

    if (!configData || typeof configData !== 'object') {
      throw new ConfigurationError(Messages.ERROR_CONFIG_EMPTY_OR_INVALID, {
        context: { configPath },
      });
    }

    // Validate and transform to opaque types
    const validatedConfig = validateConfig(configData);

    return validatedConfig;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    throw new ConfigurationError(
      `${Messages.ERROR_LOADING_CONFIG}: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { configPath },
      }
    );
  }
}

/**
 * Check if a configuration file exists.
 * @param projectRoot - Root directory of the project
 * @returns true if config file exists
 */
export function configExists(projectRoot: string = process.cwd()): boolean {
  const configPath = path.join(projectRoot, Paths.CONFIG_FILE);
  return fs.existsSync(configPath);
}
