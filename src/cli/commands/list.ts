/**
 * `syrin list` command implementation.
 * Lists tools, resources, or prompts from an MCP server.
 */

import { loadConfig } from '@/config/loader';
import {
  getConnectedClient,
  getConnectedStdioClient,
  listTools,
  listResources,
  listPrompts,
  closeConnection,
} from '@/runtime/mcp';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Icons, Labels } from '@/constants';
import type { TransportType } from '@/config/types';

type ListType = 'tools' | 'resources' | 'prompts';

interface ListCommandOptions {
  type?: ListType;
  transport?: TransportType;
  url?: string;
  command?: string;
  projectRoot?: string;
}

/**
 * Format and display tools list.
 */
function displayTools(
  tools: Array<{
    name: string;
    title?: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
  }>
): void {
  console.log(`\n${Labels.TOOLS}:`);
  console.log('─'.repeat(60));

  if (tools.length === 0) {
    console.log(`  ${Icons.WARNING} ${Labels.NO_TOOLS}`);
    return;
  }

  console.log(`  ${Labels.TOTAL_COUNT}: ${tools.length}\n`);

  for (const tool of tools) {
    console.log(`  ${Icons.CHECK} ${tool.name}`);
    if (tool.title) {
      console.log(`    ${Labels.TITLE}: ${tool.title}`);
    }
    if (tool.description) {
      // Split description into lines for better readability
      const descriptionLines = tool.description.split('\n');
      console.log(`    ${Labels.DESCRIPTION}: ${descriptionLines[0]}`);
      for (let i = 1; i < descriptionLines.length; i++) {
        console.log(`      ${descriptionLines[i]}`);
      }
    }
    if (tool.inputSchema) {
      const schemaStr = JSON.stringify(tool.inputSchema, null, 2);
      const schemaLines = schemaStr.split('\n');
      console.log(`    ${Labels.INPUT_SCHEMA}:`);
      for (const line of schemaLines) {
        console.log(`      ${line}`);
      }
    }
    if (tool.outputSchema) {
      const schemaStr = JSON.stringify(tool.outputSchema, null, 2);
      const schemaLines = schemaStr.split('\n');
      console.log(`    ${Labels.OUTPUT_SCHEMA}:`);
      for (const line of schemaLines) {
        console.log(`      ${line}`);
      }
    }
    console.log('');
  }
}

/**
 * Format and display resources list.
 */
function displayResources(
  resources: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>
): void {
  console.log(`\n${Labels.RESOURCES}:`);
  console.log('─'.repeat(60));

  if (resources.length === 0) {
    console.log(`  ${Icons.WARNING} ${Labels.NO_RESOURCES}`);
    return;
  }

  console.log(`  ${Labels.TOTAL_COUNT}: ${resources.length}\n`);

  for (const resource of resources) {
    console.log(`  ${Icons.CHECK} ${resource.uri}`);
    if (resource.name) {
      console.log(`    ${Labels.NAME}: ${resource.name}`);
    }
    if (resource.description) {
      // Split description into lines for better readability
      const descriptionLines = resource.description.split('\n');
      console.log(`    ${Labels.DESCRIPTION}: ${descriptionLines[0]}`);
      for (let i = 1; i < descriptionLines.length; i++) {
        console.log(`      ${descriptionLines[i]}`);
      }
    }
    if (resource.mimeType) {
      console.log(`    MIME Type: ${resource.mimeType}`);
    }
    console.log('');
  }
}

/**
 * Format and display prompts list.
 */
function displayPrompts(
  prompts: Array<{
    name: string;
    title?: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>
): void {
  console.log(`\n${Labels.PROMPTS}:`);
  console.log('─'.repeat(60));

  if (prompts.length === 0) {
    console.log(`  ${Icons.WARNING} ${Labels.NO_PROMPTS}`);
    return;
  }

  console.log(`  ${Labels.TOTAL_COUNT}: ${prompts.length}\n`);

  for (const prompt of prompts) {
    console.log(`  ${Icons.CHECK} ${prompt.name}`);
    if (prompt.title) {
      console.log(`    ${Labels.TITLE}: ${prompt.title}`);
    }
    if (prompt.description) {
      // Split description into lines for better readability
      const descriptionLines = prompt.description.split('\n');
      console.log(`    ${Labels.DESCRIPTION}: ${descriptionLines[0]}`);
      for (let i = 1; i < descriptionLines.length; i++) {
        console.log(`      ${descriptionLines[i]}`);
      }
    }
    if (prompt.arguments && prompt.arguments.length > 0) {
      console.log(`    ${Labels.ARGUMENTS}:`);
      for (const arg of prompt.arguments) {
        const required = arg.required ? ` (${Labels.REQUIRED})` : '';
        console.log(`      - ${arg.name}${required}`);
        if (arg.description) {
          // Handle multi-line argument descriptions
          const descLines = arg.description.split('\n');
          console.log(`        ${descLines[0]}`);
          for (let i = 1; i < descLines.length; i++) {
            console.log(`        ${descLines[i]}`);
          }
        }
      }
    }
    console.log('');
  }
}

/**
 * Execute the list command.
 */
export async function executeList(options: ListCommandOptions): Promise<void> {
  try {
    const { type = 'tools', transport, url, command, projectRoot } = options;

    // Determine transport and connection details
    let finalTransport: TransportType;
    let mcpUrl: string | undefined;
    let mcpCommand: string | undefined;

    if (transport || url || command) {
      // User provided explicit options
      // Infer transport from URL if not provided
      if (!transport) {
        if (url) {
          finalTransport = 'http';
        } else if (command) {
          finalTransport = 'stdio';
        } else {
          throw new ConfigurationError(
            'Either URL or command must be provided, or load from config.yaml'
          );
        }
      } else {
        finalTransport = transport;
      }
      mcpUrl = url;
      mcpCommand = command;
    } else {
      // Load from config
      const config = loadConfig(projectRoot);
      finalTransport = config.transport;
      mcpUrl = config.mcp_url;
      mcpCommand = config.command;
    }

    // Validate required parameters
    if (finalTransport === 'http') {
      if (!mcpUrl) {
        throw new ConfigurationError(
          'MCP URL is required for HTTP transport. Set it in config.yaml or use --url option.'
        );
      }
    } else if (finalTransport === 'stdio') {
      if (!mcpCommand) {
        throw new ConfigurationError(
          'Command is required for stdio transport. Set it in config.yaml or use --command option.'
        );
      }
    }

    // Connect to MCP server based on transport type
    let client;
    let mcpTransport;
    if (finalTransport === 'http') {
      const connection = await getConnectedClient(mcpUrl!);
      client = connection.client;
      mcpTransport = connection.transport;
    } else {
      const connection = await getConnectedStdioClient(mcpCommand!);
      client = connection.client;
      mcpTransport = connection.transport;
    }

    try {
      // List based on type
      if (type === 'tools') {
        const toolsResult = await listTools(client);
        displayTools(toolsResult.tools);
      } else if (type === 'resources') {
        const resourcesResult = await listResources(client);
        displayResources(resourcesResult.resources);
      } else if (type === 'prompts') {
        const promptsResult = await listPrompts(client);
        displayPrompts(promptsResult.prompts);
      }
    } finally {
      // Always close the connection
      await closeConnection(mcpTransport);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      logger.error('Configuration error', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else if (error instanceof Error) {
      logger.error('List command failed', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
    } else {
      logger.error('List command failed', new Error(String(error)));
      console.error(
        `\n${Icons.ERROR} Failed to list ${options.type || 'items'}\n`
      );
      process.exit(1);
    }
  }
}
