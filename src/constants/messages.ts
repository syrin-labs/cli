/**
 * Message constants used throughout the application.
 * Centralized for consistency and easy updates.
 */

export const Messages = {
  // Doctor Report Messages
  DOCTOR_SETUP_SUCCESS: 'Everything is set up well!',
  DOCTOR_ISSUES_FOUND: 'Some issues found. Please fix them before proceeding.',

  // Init Command Messages
  INIT_ALREADY_INITIALIZED: 'Syrin project is already initialized!',
  INIT_CONFIG_FILE: (configPath: string) => `Configuration file: ${configPath}`,
  INIT_SUCCESS: 'Syrin project initialized successfully!',
  INIT_NEXT_STEPS_HEADER: 'Next steps:',
  INIT_ALREADY_INIT_MSG: (configPath: string) =>
    `Syrin is already initialized. Kindly go to ${configPath} to set up.`,
  INIT_VERIFY_SETUP: (doctorCommand: string) =>
    `After the setup, you can call \`${doctorCommand}\` to verify the setup process.`,
  INIT_REINITIALIZE_TIP: 'Want to re-initialize?',
  INIT_REINITIALIZE_INSTRUCTION: (initCommand: string) =>
    `Delete the .syrin directory and run \`${initCommand}\` again.`,
  INIT_REVIEW_CONFIG: (configPath: string) =>
    `Review and edit ${configPath} if needed`,
  INIT_SETUP_ENV_VARS: 'Set up your environment variables (API keys, etc.)',
  INIT_RUN_DOCTOR: (doctorCommand: string) =>
    `Run \`${doctorCommand}\` to verify your Syrin setup`,
  INIT_RUN_DEV: (devCommand: string) =>
    `Run \`${devCommand}\` to start development mode`,

  // Error Messages
  ERROR_UNEXPECTED: 'An unexpected error occurred',
  ERROR_LOADING_CONFIG: 'Failed to load configuration file',
  ERROR_VALIDATION_FAILED: 'Configuration validation failed',
  ERROR_CONFIG_NOT_FOUND: (command: string) =>
    `Configuration file not found. Run \`${command}\` to initialize the project.`,
  ERROR_CONFIG_EMPTY_OR_INVALID: 'Configuration file is empty or invalid',
  ERROR_GENERATE_CONFIG: 'Failed to generate configuration file',

  // Environment Variable Messages
  ENV_FILE_NOT_PRESENT: (_varName: string) =>
    `.env file is not present in the project root`,
  ENV_KEY_NOT_FOUND: (varName: string) =>
    `.env file is present but key "${varName}" not found`,
  ENV_KEY_EMPTY: (varName: string) =>
    `Key "${varName}" found in .env file but the value is empty`,
  ENV_SET_INSTRUCTIONS: (varName: string) =>
    `Set ${varName} in your .env file or export it in your shell`,

  // Config Fix Messages
  CONFIG_ADD_MCP_URL:
    'Add `mcp_url` to your config.yaml file when using http transport',
  CONFIG_ADD_SCRIPTS:
    'Add `scripts` section to your config.yaml with `dev` and `start` commands. For stdio transport, `scripts.dev` is required.',
} as const;
