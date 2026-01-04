/**
 * CLI entry point for Syrin.
 * Sets up command parsing and routes to command handlers.
 */

import { Command } from 'commander';
import { executeInit } from '@/cli/commands/init';
import { executeDoctor } from '@/cli/commands/doctor';
import { executeTest } from '@/cli/commands/test';
import { executeList } from '@/cli/commands/list';
import { executeAnalyse } from '@/cli/commands/analyse';
import { executeDev } from '@/cli/commands/dev';
import { executeUpdate } from '@/cli/commands/update';
import { executeRollback } from '@/cli/commands/rollback';
import { logger, log } from '@/utils/logger';
import { Messages, ListTypes, ListType } from '@/constants';
import { getCurrentVersion } from '@/utils/version-checker';

const program = new Command();

/**
 * Initialize the CLI program.
 */
export function setupCLI(): void {
  // Get current version
  const currentVersion = getCurrentVersion();

  program
    .name('syrin')
    .description('Syrin - Runtime intelligence system for MCP servers')
    .version(currentVersion, '-v, --version', 'Display version number');

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
        // Handle ALREADY_INITIALIZED case first with early return
        if (error instanceof Error && error.message === 'ALREADY_INITIALIZED') {
          // Already handled in executeInit, just exit
          return;
        }

        // Handle other Error cases
        if (error instanceof Error) {
          logger.error('Init command failed', error);
          log.blank();
          log.error(`Error: ${error.message}`);
          log.blank();
          process.exit(1);
        }

        // Re-throw non-Error values
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
    .action(async (options: { projectRoot?: string }) => {
      try {
        await executeDoctor(options.projectRoot);
      } catch (error) {
        // Error handling is done in executeDoctor, this is a safety net
        if (error instanceof Error) {
          logger.error('Doctor command failed', error);
        }
      }
    });

  // test command
  program
    .command('test')
    .description('Test MCP connection and validate protocol compliance')
    .argument(
      '[url-or-script]',
      'MCP URL (for http transport) or script (for stdio transport). If not provided, uses value from config.yaml'
    )
    .option(
      '--transport <type>',
      'Transport type (http or stdio). If not provided, uses transport from config.yaml'
    )
    .option(
      '--url <url>',
      'MCP URL to test (for http transport). If not provided, uses URL from config.yaml or positional argument'
    )
    .option(
      '--script <script>',
      'Script to test (for stdio transport). If not provided, uses script from config.yaml or positional argument'
    )
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action(
      async (
        urlOrScript: string | undefined,
        options: {
          transport?: string;
          url?: string;
          script?: string;
          projectRoot?: string;
        }
      ) => {
        try {
          // Determine if positional argument is URL or script based on transport
          let finalUrl = options.url;
          let finalScript = options.script;

          if (urlOrScript) {
            const transport = options.transport as 'http' | 'stdio' | undefined;
            if (
              transport === 'http' ||
              (!transport && urlOrScript.startsWith('http'))
            ) {
              finalUrl = urlOrScript;
            } else {
              finalScript = urlOrScript;
            }
          }

          await executeTest({
            transport: options.transport as 'http' | 'stdio' | undefined,
            url: finalUrl,
            script: finalScript,
            projectRoot: options.projectRoot,
          });
        } catch (error) {
          // Error handling is done in executeTest
          if (error instanceof Error) {
            logger.error('Test command failed', error);
          }
        }
      }
    );

  // list command
  program
    .command('list')
    .description('List tools, resources, or prompts from an MCP server')
    .argument(
      '[type]',
      `Type to list: ${ListTypes.TOOLS}, ${ListTypes.RESOURCES}, or ${ListTypes.PROMPTS} (default: ${ListTypes.TOOLS})`,
      ListTypes.TOOLS
    )
    .option(
      '--transport <type>',
      'Transport type (http or stdio). If not provided, uses transport from config.yaml'
    )
    .option(
      '--url <url>',
      'MCP URL (for http transport). If not provided, uses URL from config.yaml'
    )
    .option(
      '--script <script>',
      'Script (for stdio transport). If not provided, uses script from config.yaml'
    )
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action(
      async (
        type: string,
        options: {
          transport?: string;
          url?: string;
          script?: string;
          projectRoot?: string;
        }
      ) => {
        try {
          const listType = type as ListType;
          if (
            ![ListTypes.TOOLS, ListTypes.RESOURCES, ListTypes.PROMPTS].includes(
              listType
            )
          ) {
            log.blank();
            log.error(Messages.LIST_INVALID_TYPE(type));
            log.plain(Messages.LIST_VALID_TYPES);
            log.blank();
            process.exit(1);
          }

          await executeList({
            type: listType,
            transport: options.transport as 'http' | 'stdio' | undefined,
            url: options.url,
            script: options.script,
            projectRoot: options.projectRoot,
          });
        } catch (error) {
          // Error handling is done in executeList
          if (error instanceof Error) {
            logger.error('List command failed', error);
          }
        }
      }
    );

  // analyse command
  program
    .command('analyse')
    .alias('analyze')
    .description('Perform static analysis on MCP tool contracts')
    .option('--ci', 'CI mode: minimal output, exit code 1 on errors')
    .option('--json', 'Output results as JSON')
    .option('--graph', 'Include dependency graph in output')
    .option(
      '--transport <type>',
      'Transport type (http or stdio). If not provided, uses transport from config.yaml'
    )
    .option(
      '--url <url>',
      'MCP URL (for http transport). If not provided, uses URL from config.yaml'
    )
    .option(
      '--script <script>',
      'Script (for stdio transport). If not provided, uses script from config.yaml'
    )
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .action(
      async (options: {
        ci?: boolean;
        json?: boolean;
        graph?: boolean;
        transport?: string;
        url?: string;
        script?: string;
        projectRoot?: string;
      }) => {
        try {
          await executeAnalyse({
            ci: options.ci,
            json: options.json,
            graph: options.graph,
            transport: options.transport as 'http' | 'stdio' | undefined,
            url: options.url,
            script: options.script,
            projectRoot: options.projectRoot,
          });
        } catch (error) {
          // Error handling is done in executeAnalyse
          if (error instanceof Error) {
            logger.error('Analyse command failed', error);
          }
        }
      }
    );

  // dev command
  program
    .command('dev')
    .description('Enter interactive development mode for testing MCP tools')
    .option(
      '--exec',
      'Execute tool calls (default: preview mode, shows what would be executed)'
    )
    .option(
      '--llm <provider>',
      'Override default LLM provider (e.g., openai, claude, ollama)'
    )
    .option(
      '--project-root <path>',
      'Project root directory (defaults to current directory)'
    )
    .option('--save-events', 'Save events to file for debugging')
    .option(
      '--event-file <path>',
      'Directory path for event files (default: .syrin/events). Events are saved as {sessionId}.jsonl'
    )
    .option(
      '--run-script',
      'Run script to spawn server internally. If not provided, stdio uses script automatically, http connects to existing server'
    )
    .action(
      async (options: {
        exec?: boolean;
        llm?: string;
        projectRoot?: string;
        saveEvents?: boolean;
        eventFile?: string;
        runScript?: boolean;
      }) => {
        try {
          await executeDev({
            exec: options.exec || false,
            llm: options.llm,
            projectRoot: options.projectRoot,
            saveEvents: options.saveEvents || false,
            eventFile: options.eventFile,
            runScript: options.runScript || false,
          });
        } catch (error) {
          // Error handling is done in executeDev
          if (error instanceof Error) {
            logger.error('Dev command failed', error);
          }
        }
      }
    );

  // update command
  program
    .command('update')
    .description('Update Syrin to the latest version')
    .action(async () => {
      try {
        await executeUpdate();
      } catch (error) {
        // Error handling is done in executeUpdate
        if (error instanceof Error) {
          logger.error('Update command failed', error);
        }
      }
    });

  // rollback command
  program
    .command('rollback')
    .description('Rollback Syrin to a previous version')
    .argument('<version>', 'Version to rollback to (e.g., 1.0.0 or v1.0.0)')
    .action(async (version: string) => {
      try {
        await executeRollback({ version });
      } catch (error) {
        // Error handling is done in executeRollback
        if (error instanceof Error) {
          logger.error('Rollback command failed', error);
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
    log.error(Messages.CLI_START_FAILED);
    process.exit(1);
  }
}
