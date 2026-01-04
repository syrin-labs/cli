/**
 * Command name constants.
 * Centralized command names used throughout the CLI.
 */

/**
 * CLI tool commands (main CLI commands).
 */
export const ToolCommands = {
  /** Main CLI name */
  CLI_NAME: 'syrin',
  /** Init command */
  INIT: 'syrin init',
  /** Doctor command */
  DOCTOR: 'syrin doctor',
  /** Dev command */
  DEV: 'syrin dev',
  /** Test command */
  TEST: 'syrin test',
  /** List command */
  LIST: 'syrin list',
  /** Analyse command */
  ANALYSE: 'syrin analyse',
} as const;

/**
 * Chat commands (available in dev mode chat interface).
 */
export const ChatCommands = {
  /** Show help message */
  HELP: '/help',
  /** Clear chat history */
  CLEAR: '/clear',
  /** List available MCP tools */
  TOOLS: '/tools',
  /** Show command history */
  HISTORY: '/history',
  /** Save tool result JSON to file */
  SAVE_JSON: '/save-json',
  /** Exit the chat */
  EXIT: '/exit',
  /** Quit the chat (alias for exit) */
  QUIT: '/quit',
} as const;
