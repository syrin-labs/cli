/**
 * Configuration file loader.
 * Loads and parses the .syrin/config.yaml file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { validateConfig } from './schema';
import { ConfigurationError } from '@/utils/errors';
import type { SyrinConfig } from './types';

/**
 * Load configuration from .syrin/config.yaml file.
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @returns Loaded and validated configuration
 * @throws {ConfigurationError} If config file is missing or invalid
 */
export function loadConfig(projectRoot: string = process.cwd()): SyrinConfig {
  const configPath = path.join(projectRoot, '.syrin', 'config.yaml');

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    throw new ConfigurationError(
      'Configuration file not found. Run `syrin init` to initialize the project.',
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
      throw new ConfigurationError('Configuration file is empty or invalid', {
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
      `Failed to load configuration file: ${error instanceof Error ? error.message : String(error)}`,
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
  const configPath = path.join(projectRoot, '.syrin', 'config.yaml');
  return fs.existsSync(configPath);
}
