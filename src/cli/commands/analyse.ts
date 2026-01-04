/**
 * `syrin analyse` command implementation.
 * Performs static analysis on MCP tool contracts.
 */

import {
  getConnectedClient,
  getConnectedStdioClient,
  closeConnection,
} from '@/runtime/mcp';
import { handleCommandError, resolveTransportConfig } from '@/cli/utils';
import { analyseTools } from '@/runtime/analysis';
import { displayAnalysisResult } from '@/presentation/analysis-ui';
import { Messages, TransportTypes } from '@/constants';
import type { TransportType } from '@/config/types';
import { log } from '@/utils/logger';

interface AnalyseCommandOptions {
  ci?: boolean;
  json?: boolean;
  graph?: boolean;
  transport?: TransportType;
  url?: string;
  script?: string;
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
    } = resolveTransportConfig(options);

    // Connect to MCP server
    let client;
    let transport;

    if (!options.ci && !options.json) {
      log.info(Messages.ANALYSE_CONNECTING);
    }

    if (finalTransport === TransportTypes.HTTP) {
      const connection = await getConnectedClient(mcpUrl!);
      client = connection.client;
      transport = connection.transport;
    } else {
      const connection = await getConnectedStdioClient(mcpCommand!);
      client = connection.client;
      transport = connection.transport;
    }

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

    // Close connection
    await closeConnection(transport);

    // Exit with appropriate code
    if (result.errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    handleCommandError(error, Messages.ANALYSE_ERROR_FAILED);
    process.exit(1);
  }
}
