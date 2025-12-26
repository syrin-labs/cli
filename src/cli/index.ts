/**
 * CLI entry point for Syrin.
 * Sets up command parsing and routes to command handlers.
 */

import { Command } from 'commander';
import { executeInit } from '@/cli/commands/init';
import { executeDoctor } from '@/cli/commands/doctor';
import { executeTest } from '@/cli/commands/test';
import { logger } from '@/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { Icons } from '@/constants';

const program = new Command();

/**
 * Initialize the CLI program.
 */
export function setupCLI(): void {
  // Load package.json for version
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent) as {
    version?: string;
  };

  program
    .name('syrin')
    .description('Syrin - Runtime intelligence system for MCP servers')
    .version(packageJson.version || '1.0.0');

  // init command
  program
    .command('init')
    .description('Initialize a new Syrin project')
    .option('-y, --yes', 'Skip interactive prompts and use default values')
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action(async (options: { yes?: boolean; projectRoot?: string }) => {
      try {
        await executeInit({
          yes: options.yes || false,
          projectRoot: options.projectRoot,
        });
      } catch (error) {
        // Only show error if it's not a graceful exit (already initialized)
        // The executeInit function handles the "already initialized" case gracefully
        if (error instanceof Error && error.message !== 'ALREADY_INITIALIZED') {
          logger.error('Init command failed', error);
          console.error(`\n${Icons.ERROR} Error: ${error.message}\n`);
          process.exit(1);
        }
        // If it's not the graceful exit case, re-throw for proper error handling
        if (error instanceof Error && error.message === 'ALREADY_INITIALIZED') {
          // Already handled in executeInit, just exit
          return;
        }
        throw error;
      }
    });

  // doctor command
  program
    .command('doctor')
    .description('Validate Syrin project configuration and setup')
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action((options: { projectRoot?: string }) => {
      try {
        executeDoctor(options.projectRoot);
      } catch (error) {
        // Error handling is done in executeDoctor
        // This catch is just for safety
        if (error instanceof Error) {
          logger.error('Doctor command failed', error);
        }
      }
    });

  // test command
  program
    .command('test')
    .description('Test MCP connection and validate protocol compliance')
    .argument('[url-or-command]', 'MCP URL (for http transport) or command (for stdio transport). If not provided, uses value from config.yaml')
    .option(
      '--transport <type>',
      'Transport type (http or stdio). If not provided, uses transport from config.yaml'
    )
    .option(
      '--url <url>',
      'MCP URL to test (for http transport). If not provided, uses URL from config.yaml or positional argument'
    )
    .option(
      '--command <command>',
      'Command to test (for stdio transport). If not provided, uses command from config.yaml or positional argument'
    )
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action(async (urlOrCommand: string | undefined, options: {
      transport?: string;
      url?: string;
      command?: string;
      projectRoot?: string;
    }) => {
      try {
        // Determine if positional argument is URL or command based on transport
        let finalUrl = options.url;
        let finalCommand = options.command;

        if (urlOrCommand) {
          const transport = options.transport as 'http' | 'stdio' | undefined;
          if (transport === 'http' || (!transport && urlOrCommand.startsWith('http'))) {
            finalUrl = urlOrCommand;
          } else {
            finalCommand = urlOrCommand;
          }
        }

        await executeTest({
          transport: options.transport as 'http' | 'stdio' | undefined,
          url: finalUrl,
          command: finalCommand,
          projectRoot: options.projectRoot,
        });
      } catch (error) {
        // Error handling is done in executeTest
        if (error instanceof Error) {
          logger.error('Test command failed', error);
        }
      }
    });

  // Parse command line arguments
  program.parse();
}

/**
 * Run the CLI.
 */
export function run(): void {
  try {
    setupCLI();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('CLI setup failed', err);
    console.error('Failed to start CLI');
    process.exit(1);
  }
}
