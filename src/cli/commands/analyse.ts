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
  sarif?: boolean;
  graph?: boolean;
  rule?: string;
  strict?: boolean;
  timeout?: number;
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

      // Build analysis options
      const analysisOptions: {
        timeoutMs?: number;
        ruleFilter?: string[];
        onProgress?: (stage: string, progress: number) => void;
      } = {};

      if (options.timeout) {
        analysisOptions.timeoutMs = options.timeout;
      }

      if (options.rule) {
        // Parse rule filter - can be comma-separated
        analysisOptions.ruleFilter = options.rule.split(',').map(r => r.trim());
      }

      // Add progress indication for non-CI/JSON mode
      if (!options.ci && !options.json) {
        let lastProgress = -1;
        analysisOptions.onProgress = (
          stage: string,
          progress: number
        ): void => {
          // Only show progress every 10% or on stage change
          if (
            progress >= lastProgress + 10 ||
            (stage === 'listing' && lastProgress < 30) ||
            (stage === 'validating' && lastProgress < 60)
          ) {
            log.info(`  ${stage}: ${progress}%`);
            lastProgress = progress;
          }
        };
      }

      // Run analysis
      const result = await analyseTools(client, undefined, analysisOptions);

      // Display results
      displayAnalysisResult(result, {
        ci: options.ci,
        json: options.json,
        sarif: options.sarif,
        graph: options.graph,
      });

      // Ensure all output is flushed before exiting
      await flushOutput();

      // Exit with appropriate code
      if (
        result.errors.length > 0 ||
        (options.strict && result.warnings.length > 0)
      ) {
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
