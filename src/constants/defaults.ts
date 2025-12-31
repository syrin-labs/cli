/**
 * Default values used throughout the application.
 */

export const Defaults = {
  /** Default MCP server URL */
  MCP_URL: 'http://localhost:8000/mcp',
  /** Default transport type */
  TRANSPORT: 'stdio',
  /** Default LLM provider */
  LLM_PROVIDER: 'openai',
  /** Default agent name */
  AGENT_NAME: 'Syrin',
  /** Default script command */
  SCRIPT_COMMAND: 'npm run start',
  /** Default working status message */
  WORKING: 'working',
} as const;
