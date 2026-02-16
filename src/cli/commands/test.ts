/**
 * `syrin test` command implementation.
 * Tests MCP connection and validates tool contracts.
 */

import { connectMCP } from '@/runtime/mcp';
import {
  handleCommandError,
  resolveTransportConfig,
  type TransportCommandOptions,
} from '@/cli/utils';
import {
  displayTestResults,
  formatCLIResults,
  formatCIResults,
  formatJSONResults,
} from '@/presentation/test-ui';
import { TestOrchestrator } from '@/runtime/test/orchestrator';
import { log } from '@/utils/logger';

interface TestCommandOptions extends TransportCommandOptions {
  /** Test connection only (legacy behavior) */
  connection?: boolean;
  /** Test specific tool only */
  tool?: string;
  /** Test all tools in a specific path (relative to tools directory) */
  path?: string;
  /** Strict mode (treat warnings as errors) */
  strict?: boolean;
  /** JSON output */
  json?: boolean;
  /** CI mode (minimal output, exit code 1 on errors) */
  ci?: boolean;
  /** Show sandbox process error output (stderr from MCP server) */
  showErrors?: boolean;
  /** Tools directory */
  toolsDir?: string;
}

/**
 * Execute the test command.
 *
 * @param options - Command options
 */
export async function executeTest(options: TestCommandOptions): Promise<void> {
  try {
    // If --connection flag is set, use legacy connection testing
    if (options.connection) {
      await executeConnectionTest(options);
      return;
    }

    // Otherwise, run tool validation
    const exitCode = await executeToolValidation(options);
    process.exit(exitCode);
  } catch (error) {
    handleCommandError(error);
  }
}

/**
 * Execute connection test (legacy behavior).
 */
async function executeConnectionTest(
  options: TestCommandOptions
): Promise<void> {
  // Resolve transport configuration from options and config
  const { transport, url, script, env, authHeaders } =
    resolveTransportConfig(options);

  // Perform the test
  const result = await connectMCP({
    transport,
    url,
    command: script,
    env,
    headers: authHeaders,
  });

  // Display results using Ink UI
  await displayTestResults({
    result,
    transport,
  });

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Execute tool validation.
 * @returns Exit code (0 for pass, 1 for fail)
 */
async function executeToolValidation(
  options: TestCommandOptions
): Promise<number> {
  const projectRoot = options.projectRoot || process.cwd();

  // Create orchestrator
  const orchestrator = new TestOrchestrator({
    projectRoot,
    toolsDir: options.toolsDir,
    toolName: options.tool,
    toolPath: options.path,
    strictMode: options.strict,
    ci: options.ci,
    showErrors: options.showErrors,
    // MCP command will be resolved from config
    env: options.env,
  });

  // Run tests
  const result = await orchestrator.run();

  // Format output
  if (options.json) {
    const jsonOutput = formatJSONResults(result);
    log.plain(jsonOutput);
  } else if (options.ci) {
    formatCIResults(result);
  } else {
    formatCLIResults(result);
  }

  // Return exit code
  // In strict mode, pass-with-warnings is treated as a failure
  // In normal mode, only 'fail' is treated as a failure
  if (result.verdict === 'fail') {
    return 1;
  }
  if (result.verdict === 'pass-with-warnings' && options.strict) {
    return 1;
  }
  return 0;
}
