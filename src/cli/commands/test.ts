/**
 * `syrin test` command implementation.
 * Tests MCP connections and validates MCP protocol compliance.
 */

import { connectMCP } from '@/runtime/mcp';
import { handleCommandError, resolveTransportConfig } from '@/cli/utils';
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
  try {
    // Resolve transport configuration from options and config
    const { transport, url, script } = resolveTransportConfig(options);

    // Perform the test
    const result = await connectMCP({
      transport,
      url,
      command: script,
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
