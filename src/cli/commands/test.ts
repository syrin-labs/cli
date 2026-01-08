/**
 * `syrin test` command implementation.
 * Tests MCP connections and validates MCP protocol compliance.
 */

import { connectMCP } from '@/runtime/mcp';
import {
  handleCommandError,
  resolveTransportConfig,
  type TransportCommandOptions,
} from '@/cli/utils';
import { displayTestResults } from '@/presentation/test-ui';

interface TestCommandOptions extends TransportCommandOptions {}

/**
 * Execute the test command.
 *
 * @param options - Command options
 */
export async function executeTest(options: TestCommandOptions): Promise<void> {
  try {
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
  } catch (error) {
    handleCommandError(error);
  }
}
