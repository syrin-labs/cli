/**
 * File and directory path constants.
 * Centralized paths used throughout the application.
 */

import * as os from 'os';
import * as path from 'path';

// Compute global directory once
const GLOBAL_SYRIN_DIR = path.join(os.homedir(), '.syrin');

export const Paths = {
  /** Syrin configuration directory name */
  SYRIN_DIR: '.syrin',
  /** Configuration file name */
  CONFIG_FILE: 'syrin.yaml',
  /** Environment file name */
  ENV_FILE: '.env',
  /** Full path to config file (relative to project root) */
  CONFIG_PATH: 'syrin.yaml',
  /** Full path to env file (relative to project root) */
  ENV_PATH: '.env',
  /** Events directory (relative to project root) */
  EVENTS_DIR: '.syrin/events',
  /** Dev history file (relative to project root) */
  DEV_HISTORY_FILE: '.syrin/.dev-history',
  /** Data directory for JSON exports (relative to project root) */
  DATA_DIR: '.syrin/data',
  /** Global Syrin configuration directory (absolute path) */
  GLOBAL_SYRIN_DIR,
  /** Global configuration file (absolute path) - derived from GLOBAL_SYRIN_DIR */
  GLOBAL_CONFIG_FILE: path.join(GLOBAL_SYRIN_DIR, 'syrin.yaml'),
  /** Global environment file (absolute path) - derived from GLOBAL_SYRIN_DIR */
  GLOBAL_ENV_FILE: path.join(GLOBAL_SYRIN_DIR, '.env'),
} as const;

/**
 * File extension constants.
 */
export const FileExtensions = {
  JSONL: '.jsonl',
} as const;
