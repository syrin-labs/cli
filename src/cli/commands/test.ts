/**
 * `syrin test` command implementation.
 * Tests MCP connections and validates MCP protocol compliance.
 */

import { loadConfig } from '@/config/loader';
import { connectMCP } from '@/runtime/mcp';
import { ConfigurationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Icons, Messages } from '@/constants';
import type { TransportType } from '@/config/types';
import { displayTestResults } from '@/presentation/test-ui';

interface TestCommandOptions {
  transport?: TransportType;
  url?: string;
  script?: string;
  projectRoot?: string;
}

/**
 * Execute the test command.
 *
 * @param options - Command options
 */
export async function executeTest(options: TestCommandOptions): Promise<void> {
  const { transport, url, script, projectRoot } = options;

  try {
    // Load config to get default values
    const config = loadConfig(projectRoot);

    // Determine transport type
    const transportType: TransportType = transport || config.transport;
    let mcpUrl: string | undefined;
    let mcpCommand: string | undefined;

    if (transportType === 'http') {
      // Use provided URL or fall back to config
      mcpUrl = url || config.mcp_url;
    } else {
      // Use provided script or fall back to config.script
      mcpCommand =
        script || (config.script ? String(config.script) : undefined);
    }

    // Validate that we have the required parameters
    if (transportType === 'http' && !mcpUrl) {
      throw new ConfigurationError(
        'MCP URL is required. Provide it as an argument or ensure it is set in config.yaml'
      );
    }

    if (transportType === 'stdio' && !mcpCommand) {
      throw new ConfigurationError(
        'Script is required. Provide it as an argument (--script) or ensure script is set in config.yaml'
      );
    }

    // Perform the test
    const result = await connectMCP({
      transport: transportType,
      url: mcpUrl,
      command: mcpCommand,
    });

    // Display results using Ink UI
    await displayTestResults({
      result,
      transport: transportType,
    });

    // Exit with appropriate code
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      logger.error('Test command failed', error);
      console.error(`\n${Icons.ERROR} ${error.message}\n`);
      process.exit(1);
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Test command failed', err);
    console.error(
      `\n${Icons.ERROR} ${Messages.ERROR_UNEXPECTED}: ${err.message}\n`
    );
    process.exit(1);
  }
}
