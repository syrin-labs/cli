/**
 * `syrin analyse` command implementation.
 * Performs static analysis on MCP tool contracts.
 */

import { analyseTools } from '@/runtime/analysis';
import { displayAnalysisResult } from '@/presentation/analysis-ui';
import {
  handleCommandError,
  resolveTransportConfig,
  establishConnection,
  safeCloseConnection,
  flushOutput,
  type TransportCommandOptions,
} from '@/cli/utils';
import { Messages } from '@/constants';
import { log } from '@/utils/logger';

interface AnalyseCommandOptions extends TransportCommandOptions {
  ci?: boolean;
  json?: boolean;
  graph?: boolean;
}

/**
 * Execute the analyse command.
 */
export async function executeAnalyse(
  options: AnalyseCommandOptions
): Promise<void> {
  try {
    // Resolve transport configuration
    const {
      transport: finalTransport,
      url: mcpUrl,
      script: mcpCommand,
      urlSource,
      env,
      authHeaders,
    } = resolveTransportConfig(options);

    if (!options.ci && !options.json) {
      log.info(Messages.ANALYSE_CONNECTING);
    }

    // Connect to MCP server with centralized error handling
    const { client, transport } = await establishConnection({
      transport: finalTransport,
      url: mcpUrl,
      script: mcpCommand,
      urlSource,
      env,
      authHeaders,
    });

    try {
      if (!options.ci && !options.json) {
        log.info(Messages.ANALYSE_LOADING_TOOLS);
      }

      // Run analysis
      const result = await analyseTools(client);

      // Display results
      displayAnalysisResult(result, {
        ci: options.ci,
        json: options.json,
        graph: options.graph,
      });

      // Ensure all output is flushed before exiting
      await flushOutput();

      // Exit with appropriate code
      if (result.errors.length > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } finally {
      // Always close the connection safely, even if errors occur
      await safeCloseConnection(transport);
    }
  } catch (error) {
    handleCommandError(error, Messages.ANALYSE_ERROR_FAILED);
    process.exit(1);
  }
}
