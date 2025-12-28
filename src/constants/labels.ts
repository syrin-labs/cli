/**
 * Label constants for CLI output.
 * Used in doctor reports and other formatted output.
 */

export const Labels = {
  // Doctor Report Labels
  DOCTOR_REPORT_TITLE: 'Syrin Doctor Report',
  SYRIN_VERSION: 'Syrin Version:',
  MCP_PROJECT_NAME: 'MCP Project Name:',
  AGENT_NAME: 'Agent Name:',
  TRANSPORT_LAYER: 'Transport Layer:',
  MCP_URL: 'MCP URL:',
  COMMAND: 'Command:',
  SCRIPTS: 'Scripts:',
  LLMS: 'LLMs:',
  MODEL: 'Model',

  // Script Labels
  SCRIPT_DEV: 'dev',
  SCRIPT_START: 'start',

  // Status Messages
  STATUS_WORKING: '(working)',
  STATUS_DEFAULT: '(default)',
  STATUS_MISSING: 'Missing',
  STATUS_NA: 'N/A',

  // List Command Labels
  TOOLS: 'Tools',
  RESOURCES: 'Resources',
  PROMPTS: 'Prompts',
  NAME: 'Name',
  TITLE: 'Title',
  DESCRIPTION: 'Description',
  URI: 'URI',
  ARGUMENTS: 'Arguments',
  REQUIRED: 'Required',
  INPUT_SCHEMA: 'Input Schema',
  OUTPUT_SCHEMA: 'Output Schema',
  NO_TOOLS: 'No tools available',
  NO_RESOURCES: 'No resources available',
  NO_PROMPTS: 'No prompts available',
  TOTAL_COUNT: 'Total',
} as const;
