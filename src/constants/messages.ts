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
  CONFIG_ADD_SCRIPT_STDIO:
    'Add script to your config.yaml file when using stdio transport',

  // Transport/Connection Error Messages
  TRANSPORT_URL_REQUIRED:
    'MCP URL is required for HTTP transport. Set it in config.yaml or use --url option.',
  TRANSPORT_SCRIPT_REQUIRED:
    'Script is required for stdio transport. Set it in config.yaml or use --script option.',
  TRANSPORT_SCRIPT_REQUIRED_RUN_FLAG:
    'script is required when using --run-script flag',
  TRANSPORT_URL_REQUIRED_CONFIG:
    'MCP URL is required for HTTP transport. Set it in config.yaml.',
  CONNECTION_FAILED: (
    mcpUrl: string,
    source: string,
    transportType: string = 'http'
  ) =>
    `Cannot connect to MCP server using ${transportType.toUpperCase()} transport.\n` +
    `\n` +
    `MCP URL: ${mcpUrl}${source}\n` +
    `Transport: ${transportType.toUpperCase()}\n` +
    `\n` +
    `The server appears to be not running or unreachable.\n` +
    `\n` +
    `To fix this:\n` +
    `  1. Make sure the MCP server is running\n` +
    `  2. Verify the URL is correct: ${mcpUrl}\n` +
    `  3. Check if the server is listening on the expected port\n` +
    (transportType === 'http' && source.includes('config')
      ? `  4. If you intended to use stdio transport, use --script instead of --url\n`
      : ''),
  CONNECTION_TIMEOUT_HTTP: (mcpUrl: string) =>
    `Connection to MCP server at ${mcpUrl} timed out.\n` +
    `The server may be slow to respond or not running.`,
  CONNECTION_FAILED_STDIO: (mcpCommand: string) =>
    `Failed to start MCP server process: ${mcpCommand}\n` +
    `\n` +
    `The script may be incorrect or the executable not found.\n` +
    `Verify the script path in config.yaml or use --script option.`,
  CONNECTION_TIMEOUT_STDIO:
    `Connection to MCP server via stdio timed out.\n` +
    `The server process may have failed to start or is not responding.`,

  // Dev Command Messages
  DEV_WELCOME: 'Welcome to Syrin Dev Mode!',
  DEV_VERSION_INFO: (version: string, llm: string, tools: number) =>
    `Version: ${version} | LLM: ${llm} | Tools: ${tools}`,
  DEV_TRANSPORT_HTTP: (transport: string, url: string) =>
    `Transport: ${transport} | MCP URL: ${url} ✅`,
  DEV_TRANSPORT_STDIO: (transport: string, command: string) =>
    `Transport: ${transport} | Command: ${command} ✅`,
  DEV_HELP_MESSAGE: 'Type your message below or /help for commands.',
  DEV_TOOLS_HEADER: 'Available Tools:',
  DEV_NO_TOOLS: '  No tools available',
  DEV_HISTORY_HEADER: 'Command History (last 100 entries):',
  DEV_NO_HISTORY: 'No command history yet.',
  DEV_ERROR_READING_HISTORY: (error: string) =>
    `Error reading history: ${error}`,
  DEV_TOOL_CALLING: (name: string) => `🔧 Calling tool: ${name}`,
  DEV_TOOL_COMPLETED: (name: string, duration?: number) =>
    `✅ Tool ${name} completed${duration ? ` (${duration}ms)` : ''}`,
  DEV_ERROR_START: 'Failed to start dev mode',
  DEV_GOODBYE: '\n\nGoodbye! 👋',

  // Doctor Command Messages
  DOCTOR_SCRIPT_MISSING: 'script is missing',
  DOCTOR_COMMAND_NOT_FOUND: (command: string) =>
    `Command "${command}" not found in PATH`,
  DOCTOR_COMMAND_INSTALL: (command: string) =>
    `Make sure "${command}" is installed and available in your PATH`,
  DOCTOR_SCRIPT_WORKING: 'working',
  DOCTOR_SCRIPT_INFO: (script: string) => `Script: ${script}`,
  DOCTOR_MCP_URL_INFO: (url: string) => `MCP URL: ${String(url)}`,

  // List Command Messages
  LIST_INVALID_TYPE: (type: string) => `Invalid list type: ${type}`,
  LIST_VALID_TYPES: 'Valid types are: tools, resources, prompts',
  LIST_ERROR_FAILED: (type: string) => `Failed to list ${type}`,
  LIST_SOURCE_CONFIG: ' (from config.yaml)',
  LIST_SOURCE_CLI_URL: ' (from --url)',

  // Prompt Validation Messages
  PROMPT_PROJECT_NAME_REQUIRED: 'Project name is required',
  PROMPT_PROJECT_NAME_INVALID:
    'Project name can only contain letters, numbers, and hyphens',
  PROMPT_AGENT_NAME_REQUIRED: 'Agent name is required',
  PROMPT_MCP_URL_REQUIRED: 'MCP server URL is required for http transport',
  PROMPT_URL_INVALID: 'Invalid URL format',
  PROMPT_SCRIPT_REQUIRED: 'Script command is required',
  PROMPT_LLM_PROVIDER_REQUIRED: 'At least one LLM provider must be selected',
  PROMPT_OPENAI_API_KEY_REQUIRED: 'OpenAI API key is required',
  PROMPT_OPENAI_MODEL_REQUIRED: 'OpenAI model name is required',
  PROMPT_CLAUDE_API_KEY_REQUIRED: 'Claude API key is required',
  PROMPT_CLAUDE_MODEL_REQUIRED: 'Claude model name is required',
  PROMPT_OLLAMA_MODEL_REQUIRED: 'Ollama model name is required',

  // CLI Error Messages
  CLI_START_FAILED: 'Failed to start CLI',

  // Update/Rollback Messages
  UPDATE_CHECKING: 'Checking for updates...',
  UPDATE_CURRENT_VERSION: (version: string) => `Current version: ${version}`,
  UPDATE_LATEST_VERSION: (version: string) => `Latest version: ${version}`,
  UPDATE_ALREADY_LATEST: (version: string) =>
    `Already on latest version: ${version}`,
  UPDATE_IN_PROGRESS: (packageName: string) => `Updating ${packageName}...`,
  UPDATE_SUCCESS: (version: string) => `Successfully updated to ${version}`,
  UPDATE_FAILED: 'Update failed',
  UPDATE_ERROR: (error: string) => `Error updating: ${error}`,
  UPDATE_PERMISSION_HINT: (command: string) =>
    `Permission denied. Try running: ${command}`,

  ROLLBACK_IN_PROGRESS: (version: string, packageName: string) =>
    `Rolling back ${packageName} to ${version}...`,
  ROLLBACK_SUCCESS: (version: string) =>
    `Successfully rolled back to ${version}`,
  ROLLBACK_FAILED: 'Rollback failed',
  ROLLBACK_ERROR: (error: string) => `Error rolling back: ${error}`,
  ROLLBACK_INVALID_VERSION: (version: string) =>
    `Invalid version format: ${version}. Expected format: 1.0.0 or v1.0.0`,
  ROLLBACK_VERSION_NOT_FOUND: (version: string) =>
    `Version ${version} not found on npm registry`,
  ROLLBACK_CONFIRM: (currentVersion: string, targetVersion: string) =>
    `Are you sure you want to rollback from ${currentVersion} to ${targetVersion}?`,

  // Analyse Command Messages
  ANALYSE_CONNECTING: 'Connecting to MCP server...',
  ANALYSE_LOADING_TOOLS: 'Loading tools...',
  ANALYSE_ANALYZING: 'Analyzing tools...',
  ANALYSE_ERROR_FAILED: 'Failed to analyze MCP server',
  ANALYSE_NO_TOOLS: 'No tools found in MCP server',
  ANALYSE_VERDICT_PASS: 'Syrin analysis passed',
  ANALYSE_VERDICT_FAIL: (errors: number, warnings: number) =>
    `Syrin analysis failed (${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''})`,
  ANALYSE_VERDICT_PASS_WARNINGS: (warnings: number) =>
    `Syrin analysis passed with ${warnings} warning${warnings !== 1 ? 's' : ''}`,
  ANALYSE_ERRORS_HEADER: 'Errors:',
  ANALYSE_WARNINGS_HEADER: 'Warnings:',
  ANALYSE_SUGGESTIONS_HEADER: 'Suggestions:',
} as const;
