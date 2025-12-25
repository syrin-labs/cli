/**
 * File and directory path constants.
 * Centralized paths used throughout the application.
 */

export const Paths = {
  /** Syrin configuration directory name */
  SYRIN_DIR: '.syrin',
  /** Configuration file name */
  CONFIG_FILE: 'config.yaml',
  /** Environment file name */
  ENV_FILE: '.env',
  /** Full path to config file (relative to project root) */
  CONFIG_PATH: '.syrin/config.yaml',
  /** Full path to env file (relative to project root) */
  ENV_PATH: '.env',
} as const;
