/**
 * File and directory path constants.
 * Centralized paths used throughout the application.
 */

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
} as const;

/**
 * File extension constants.
 */
export const FileExtensions = {
  JSONL: '.jsonl',
} as const;
