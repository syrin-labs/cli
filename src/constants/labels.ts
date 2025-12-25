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
} as const;
