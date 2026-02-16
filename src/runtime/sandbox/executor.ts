/**
 * Tool executor with process isolation.
 * Provides process-based isolation (not true sandbox/chroot/containers).
 * This module is reusable for any tool execution needs, not just testing.
 *
 * IMPORTANT: This is NOT a secure sandbox. It provides:
 * - Process isolation (each tool runs in separate process)
 * - Memory limits (via ulimit or --max-old-space-size)
 * - Timeout enforcement
 * - I/O monitoring
 *
 * It does NOT provide:
 * - Filesystem isolation (chroot)
 * - Network isolation
 * - Container/namespace isolation
 *
 * For production use with untrusted tools, consider using containers/VMs.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseCommand } from '@/runtime/mcp/client/process';
import type { Command } from '@/types/ids';
import { ConfigurationError } from '@/utils/errors';
import { formatTimeString } from './time-parser';
import type { ToolExecutionError, ToolExecutionResult } from './types';
import { ToolExecutionErrorType } from './types';
import { log } from '@/utils/logger';
import type { IOMonitor } from './io-monitor';

// Re-export types for convenience
export * from './types';
export { IOMonitor } from './io-monitor';

/**
 * Options for tool execution.
 * Note: Provides process isolation only, not true sandboxing.
 */
export interface SandboxOptions {
  /** Timeout for tool execution in milliseconds */
  timeout: number;
  /** Memory limit in MB (enforced via command wrapping).
   *
   * Memory limits are enforced by wrapping the command:
   * - POSIX systems: Wraps command with `ulimit -v <memoryMB>M &&`
   * - Node.js commands: Injects `--max-old-space-size=<memoryMB>` into node args
   * - Other commands: Uses ulimit wrapper on POSIX systems
   */
  memoryLimitMB?: number;
  /** MCP server command to execute */
  mcpCommand: Command | string;
  /** Environment variables for the process */
  env?: Record<string, string>;
  /** Project root directory (for detecting side effects) */
  projectRoot: string;
  /** Suppress stderr output (redirect to /dev/null) */
  suppressStderr?: boolean;
  /** Optional I/O monitor for capturing process output (v1.5.0) */
  ioMonitor?: IOMonitor;
}

/**
 * Tool executor with process reuse.
 * Provides process-based isolation for tool execution.
 *
 * WARNING: This is NOT a secure sandbox. See module docs for limitations.
 */
export class SandboxExecutor {
  // Note: serverProcess is managed by StdioClientTransport internally
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tempDir: string | null = null;
  private initialized: boolean = false;
  private serverProcess: ChildProcess | null = null;
  private readonly options: SandboxOptions;
  // v1.5.0: Track if any timeouts occurred to force process restart
  private hasTimeoutOccurred: boolean = false;

  constructor(options: SandboxOptions) {
    this.options = options;
  }

  /**
   * Initialize the sandbox (start MCP server process).
   * This should be called once before testing multiple tools.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // v1.5.0: Log if re-initializing after a timeout
    if (this.hasTimeoutOccurred) {
      log.info('Re-initializing sandbox after previous timeout');
      this.hasTimeoutOccurred = false;
    }

    try {
      // Create isolated temp directory
      this.tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'syrin-sandbox-')
      );

      // Parse command
      let { executable, args } = parseCommand(this.options.mcpCommand);
      let isWrapped = false;

      // Apply memory limit enforcement if specified
      if (this.options.memoryLimitMB) {
        const memoryMB = this.options.memoryLimitMB;

        // Check if this is a Node.js command
        const isNodeCommand =
          executable === 'node' || executable.endsWith('/node');

        if (isNodeCommand) {
          // For Node.js: inject --max-old-space-size flag
          args = ['--max-old-space-size', String(memoryMB), ...args];
          log.debug(
            `Memory limit: ${memoryMB}MB enforced via --max-old-space-size for Node.js`
          );
        } else if (process.platform !== 'win32') {
          // For POSIX systems: wrap with ulimit -v (virtual memory limit)
          // Convert MB to KB (ulimit -v uses KB)
          const memoryKB = memoryMB * 1024;
          // Wrap the original command with ulimit
          const originalCommand = [executable, ...args]
            .map(arg => (arg.includes(' ') ? `"${arg}"` : arg))
            .join(' ');
          executable = '/bin/sh';
          args = ['-c', `ulimit -v ${memoryKB} && exec ${originalCommand}`];
          isWrapped = true;
          log.debug(
            `Memory limit: ${memoryMB}MB (${memoryKB}KB) enforced via ulimit -v`
          );
        } else {
          // Windows: Memory limits require different approach (SetProcessWorkingSetSize, Job Objects)
          // For now, log warning that limit is not enforced on Windows
          log.warn(
            `Memory limit ${memoryMB}MB specified but not enforced on Windows platform`
          );
        }
      }

      // Suppress stderr output if requested (for CI mode)
      if (this.options.suppressStderr) {
        if (process.platform !== 'win32') {
          // POSIX: Add stderr redirection to /dev/null
          if (isWrapped) {
            // Already wrapped - add stderr redirection to the existing wrapper
            args[1] = `${args[1]} 2>/dev/null`;
          } else {
            // Not wrapped yet - wrap to redirect stderr
            const originalCommand = [executable, ...args]
              .map(arg => (arg.includes(' ') ? `"${arg}"` : arg))
              .join(' ');
            executable = '/bin/sh';
            args = ['-c', `${originalCommand} 2>/dev/null`];
          }
        } else {
          // Windows: Add stderr redirection to NUL
          if (isWrapped) {
            // Already wrapped - add stderr redirection to the existing wrapper
            args[1] = `${args[1]} 2>NUL`;
          } else {
            // Not wrapped yet - wrap to redirect stderr
            const originalCommand = [executable, ...args]
              .map(arg => (arg.includes(' ') ? `"${arg}"` : arg))
              .join(' ');
            executable = 'cmd.exe';
            args = ['/c', `${originalCommand} 2>NUL`];
          }
        }
      }

      // Prepare environment
      const env = {
        ...process.env,
        ...this.options.env,
        SYRIN_SANDBOX: 'true',
        SYRIN_TEMP_DIR: this.tempDir,
      };

      // Create MCP client
      this.client = new Client(
        {
          name: 'syrin-test',
          version: '1.3.0',
        },
        {
          capabilities: {},
        }
      );

      // Create stdio transport (this will spawn the process automatically)
      // Note: StdioClientTransport handles process spawning internally
      // Use project root as cwd (not temp dir) so the server can find its files
      // Memory limits are enforced via command wrapping (see above)
      this.transport = new StdioClientTransport({
        command: executable,
        args,
        env: env as Record<string, string>,
        cwd: this.options.projectRoot,
      });

      // v1.5.0: Access the spawned process for memory monitoring
      // StdioClientTransport stores the process in _process private property
      // We need to access it via type assertion since it's not in the public API
      const transportWithProcess = this.transport as unknown as {
        _process?: ChildProcess;
      };
      this.serverProcess = transportWithProcess._process ?? null;

      // v1.5.0: Hook up I/O monitor to capture process output
      if (this.options.ioMonitor && this.serverProcess) {
        if (this.serverProcess.stdout) {
          this.options.ioMonitor.captureStream(
            this.serverProcess.stdout,
            'stdout'
          );
        }
        if (this.serverProcess.stderr) {
          this.options.ioMonitor.captureStream(
            this.serverProcess.stderr,
            'stderr'
          );
        }
      }

      // Set up error handlers
      this.client.onerror = (event: unknown): void => {
        // Log connection-level errors for debugging
        const errorMessage =
          event instanceof Error
            ? event.message
            : typeof event === 'object' && event !== null && 'message' in event
              ? String((event as { message: unknown }).message)
              : 'Unknown MCP client error';
        log.error(
          `Error: ${errorMessage}`,
          event instanceof Error ? event : new Error(errorMessage)
        );
        // Errors will also be caught in try-catch blocks during tool execution
      };

      // Connect client to server (StdioClientTransport spawns the process here)
      await this.client.connect(this.transport);

      // Poll for server readiness with exponential backoff
      const maxWaitTime = 5000; // Maximum total wait time: 5 seconds
      const initialBackoff = 100; // Start with 100ms
      const maxBackoff = 500; // Cap at 500ms
      const startTime = Date.now();
      let backoff = initialBackoff;
      let lastError: Error | undefined;

      while (Date.now() - startTime < maxWaitTime) {
        try {
          // Try to list tools to verify server is ready
          const listToolsPromise = this.client.listTools();
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => {
                reject(new Error('listTools timeout'));
              },
              Math.min(backoff, 1000)
            ); // Use backoff as timeout, max 1s
          });
          await Promise.race([listToolsPromise, timeoutPromise]);
          // Success - server is ready
          break;
        } catch (pollError) {
          lastError =
            pollError instanceof Error
              ? pollError
              : new Error(String(pollError));
          // Check if we've exceeded max wait time
          if (Date.now() - startTime >= maxWaitTime) {
            throw new ConfigurationError(
              `MCP server did not become ready within ${maxWaitTime}ms. Command may not exist or server failed to start.`,
              { cause: lastError }
            );
          }
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, backoff));
          backoff = Math.min(backoff * 1.5, maxBackoff); // Exponential backoff with cap
        }
      }

      // Final verification (in case we exited loop due to timeout)
      if (Date.now() - startTime >= maxWaitTime && lastError) {
        throw new ConfigurationError(
          `MCP server did not become ready within ${maxWaitTime}ms. Command may not exist or server failed to start.`,
          { cause: lastError }
        );
      }

      this.initialized = true;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Parse MCP protocol response and extract output or error.
   * Handles various response formats from MCP SDK.
   * @param rawResult - Raw result from MCP SDK
   * @param timedOut - Whether execution timed out
   * @returns Object with output and error (mutually exclusive)
   */
  private parseMcpResponse(
    rawResult: unknown,
    timedOut: boolean
  ): { output: unknown; error: ToolExecutionError | undefined } {
    // Handle non-object responses
    if (!rawResult || typeof rawResult !== 'object') {
      return { output: rawResult, error: undefined };
    }

    // Check for error field (MCP protocol error response)
    if ('error' in rawResult && rawResult.error) {
      const errorObj = rawResult.error as { message?: string; code?: number };
      const mcpError = new Error(
        errorObj.message ||
          `Tool execution failed with code ${errorObj.code || 'unknown'}`
      );
      return {
        output: undefined,
        error: this.classifyError(mcpError, rawResult, timedOut),
      };
    }

    // Check for content array (MCP SDK standard response format)
    if ('content' in rawResult) {
      const content = (
        rawResult as {
          content?: Array<{
            type?: string;
            text?: string;
            error?: unknown;
          }>;
        }
      ).content;

      if (!Array.isArray(content) || content.length === 0) {
        return { output: rawResult, error: undefined };
      }

      // Check for error content in MCP protocol
      const errorContent = content.find(
        item => item.type === 'error' || item.error
      );
      if (errorContent) {
        const errorMessage =
          (errorContent as { text?: string; error?: { message?: string } })
            .text ||
          (errorContent.error as { message?: string })?.message ||
          'Tool execution failed';
        const mcpError = new Error(errorMessage);
        return {
          output: undefined,
          error: this.classifyError(mcpError, rawResult, timedOut),
        };
      }

      // Extract text content
      const textContent = content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n');

      if (textContent) {
        // Check if this looks like an error message
        if (this.isErrorText(textContent)) {
          const errorMessage = new Error(textContent);
          return {
            output: undefined,
            error: this.classifyError(errorMessage, rawResult, timedOut),
          };
        }

        // Try to parse as JSON (for structured outputs like Pydantic models)
        try {
          const parsedOutput = JSON.parse(textContent);
          // Check if parsed output contains error-like structure
          if (parsedOutput && typeof parsedOutput === 'object') {
            if (
              'error' in parsedOutput ||
              'exception' in parsedOutput ||
              'traceback' in parsedOutput
            ) {
              const errorMsg =
                (
                  parsedOutput as {
                    error?: string;
                    exception?: string;
                    traceback?: string;
                  }
                ).error ||
                (
                  parsedOutput as {
                    error?: string;
                    exception?: string;
                    traceback?: string;
                  }
                ).exception ||
                String(parsedOutput);
              return {
                output: undefined,
                error: this.classifyError(
                  new Error(errorMsg),
                  rawResult,
                  timedOut
                ),
              };
            }
          }
          return { output: parsedOutput, error: undefined };
        } catch {
          // If not JSON, use text as-is
          return { output: textContent, error: undefined };
        }
      }
    }

    // Fallback: return raw result as output
    return { output: rawResult, error: undefined };
  }

  /**
   * Check if text content looks like an error message.
   * This handles cases where MCP servers return errors as text instead of proper error responses.
   */
  private isErrorText(text: string): boolean {
    // Check for validation error patterns (more specific and robust)
    const validationPatterns = [
      /validation\s+error/i,
      /validationerror/i,
      /input\s+should\s+be\s+a\s+valid/i,
      /invalid\s+parameter/i,
      /invalid\s+params/i,
      /type.*mismatch/i,
      /required\s+field/i,
    ];

    // Check for general error patterns
    const errorPatterns = [
      /^error:/i,
      /^exception:/i,
      /traceback/i,
      /failed\s+to/i,
      /cannot\s+.*because/i,
      // FastMCP exception patterns - exceptions are logged but might appear in output
      /^valueerror:/i,
      /^runtimeerror:/i,
      /^typeerror:/i,
      /^keyerror:/i,
      /^attributeerror:/i,
      /execution\s+failed/i,
      /error\s+calling\s+tool/i,
    ];

    // Must match at least one pattern and be reasonably short (error messages, not large outputs)
    const isShortEnough = text.length < 2000; // Error messages are typically short

    // Also check if text contains exception-like patterns (common in Python tracebacks)
    const hasExceptionPattern =
      /^\s*\w+Error\s*:/i.test(text) ||
      /^\s*Traceback\s+\(most\s+recent\s+call\s+last\)/i.test(text);

    return (
      isShortEnough &&
      (validationPatterns.some(pattern => pattern.test(text)) ||
        errorPatterns.some(pattern => pattern.test(text)) ||
        hasExceptionPattern)
    );
  }

  /**
   * Classify error type from error message and MCP protocol response.
   */
  private classifyError(
    error: Error,
    rawResult?: unknown,
    timedOut: boolean = false
  ): ToolExecutionError {
    if (timedOut) {
      return Object.assign(error, {
        errorType: ToolExecutionErrorType.TIMEOUT,
        name: 'ToolExecutionTimeout',
      });
    }

    // Check MCP protocol error codes
    if (rawResult && typeof rawResult === 'object') {
      // MCP protocol uses error codes: -32700 to -32099
      // -32602: Invalid params (input validation)
      // -32603: Internal error (execution error)
      if ('error' in rawResult && rawResult.error) {
        const errorObj = rawResult.error as { code?: number; message?: string };
        const errorCode = errorObj.code;

        if (errorCode === -32602) {
          return Object.assign(new Error(errorObj.message || error.message), {
            errorType: ToolExecutionErrorType.INPUT_VALIDATION,
            errorCode,
            name: 'MCPInvalidParams',
            context: { mcpErrorCode: errorCode },
          });
        }

        if (errorCode) {
          return Object.assign(new Error(errorObj.message || error.message), {
            errorType: ToolExecutionErrorType.EXECUTION_ERROR,
            errorCode,
            name: 'MCPExecutionError',
            context: { mcpErrorCode: errorCode },
          });
        }
      }
    }

    // Classify based on error message patterns (fallback, but more robust)
    const message = error.message.toLowerCase();

    // Input validation patterns (more specific)
    if (
      message.includes('invalid params') ||
      message.includes('invalid parameter') ||
      message.includes('validation error') ||
      (message.includes('input should be') && message.includes('type'))
    ) {
      return Object.assign(error, {
        errorType: ToolExecutionErrorType.INPUT_VALIDATION,
        name: 'InputValidationError',
      });
    }

    // Connection errors (use specific patterns to avoid false positives)
    if (
      message.includes('connection refused') ||
      message.includes('connection reset') ||
      message.includes('connect failed') ||
      message.includes('unable to connect') ||
      message.includes('econnrefused') ||
      message.includes('network')
    ) {
      return Object.assign(error, {
        errorType: ToolExecutionErrorType.CONNECTION_ERROR,
        name: 'ConnectionError',
      });
    }

    // Default to execution error
    return Object.assign(error, {
      errorType: ToolExecutionErrorType.EXECUTION_ERROR,
      name: 'ToolExecutionError',
    });
  }

  /**
   * Execute a tool with the given inputs.
   * @param toolName - Name of the tool to execute
   * @param inputs - Array of input objects to test
   * @param timeoutMs - Optional per-tool timeout in milliseconds (overrides default)
   * @returns Array of execution results (one per input)
   */
  async executeTool(
    toolName: string,
    inputs: Array<Record<string, unknown>>,
    timeoutMs?: number
  ): Promise<ToolExecutionResult[]> {
    if (!this.initialized || !this.client) {
      throw new ConfigurationError(
        'Sandbox not initialized. Call initialize() first.'
      );
    }

    const results: ToolExecutionResult[] = [];

    for (const input of inputs) {
      const startTime = Date.now();
      let timedOut = false;
      let output: unknown;
      let error: ToolExecutionError | undefined;
      let rawResult: unknown;

      try {
        // Use per-tool timeout if provided, otherwise use default
        const effectiveTimeout = timeoutMs ?? this.options.timeout;

        // Execute with timeout
        const executionPromise = this.client.callTool({
          name: toolName,
          arguments: input,
        });

        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            timedOut = true;
            reject(
              new Error(
                `Tool execution timeout after ${this.formatTimeout(effectiveTimeout)}`
              )
            );
          }, effectiveTimeout);
        });

        try {
          rawResult = await Promise.race([executionPromise, timeoutPromise]);
        } catch (err) {
          // v1.5.0: If timeout occurred, kill the process to stop the hanging tool
          if (timedOut && this.serverProcess) {
            log.warn(
              `Tool execution timed out, killing process to prevent background execution`
            );
            this.hasTimeoutOccurred = true;
            this.serverProcess.kill('SIGTERM');
            // Force re-initialization on next execution
            this.initialized = false;
          }
          throw err;
        } finally {
          // Clear the timeout timer if execution completed before timeout
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
        }

        // Parse MCP response to extract output or error
        const parsed = this.parseMcpResponse(rawResult, timedOut);
        output = parsed.output;
        error = parsed.error;
      } catch (err) {
        const baseError = err instanceof Error ? err : new Error(String(err));
        error = this.classifyError(baseError, rawResult, timedOut);
        output = undefined;
      }

      const executionTime = Date.now() - startTime;

      // Get memory usage if available (platform-specific)
      const memoryUsed = this.getProcessMemoryUsage();

      if (error) {
        results.push({
          success: false,
          error,
          executionTime,
          memoryUsed,
          timedOut: timedOut || undefined,
        });
      } else {
        results.push({
          success: true,
          output: output ?? null,
          executionTime,
          memoryUsed,
        });
      }
    }

    return results;
  }

  /**
   * Format timeout in milliseconds to human-readable string.
   */
  private formatTimeout(ms: number): string {
    return formatTimeString(ms);
  }

  /**
   * Get the MCP client instance (for reuse by orchestrator).
   * @returns The MCP client, or null if not initialized
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Get current process memory usage (if available).
   * v1.5.0: Now correctly reports child process memory, not parent process.
   * @returns Memory usage in MB, or undefined if not available
   */
  private getProcessMemoryUsage(): number | undefined {
    // v1.5.0: Track child process memory, not parent process
    if (!this.serverProcess?.pid) {
      return undefined;
    }

    const pid = this.serverProcess.pid;

    try {
      if (process.platform === 'linux') {
        // Linux: Read from /proc/{pid}/status
        const status = fs.readFileSync(`/proc/${pid}/status`, 'utf-8');
        const match = status.match(/VmRSS:\s*(\d+)\s*kB/);
        if (match) {
          // Convert KB to MB
          return Math.round(parseInt(match[1]!, 10) / 1024);
        }
      } else if (process.platform === 'darwin') {
        // macOS: Use ps command
        const { execSync } = require('child_process');
        const output = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf-8' });
        const rssKB = parseInt(output.trim(), 10);
        if (!isNaN(rssKB)) {
          // Convert KB to MB
          return Math.round(rssKB / 1024);
        }
      }
      // Windows: Could use wmic or tasklist, but for now return undefined
      // as it requires async operations
    } catch {
      // If we can't read memory usage, return undefined
    }

    return undefined;
  }

  /**
   * Cleanup sandbox resources.
   * Should be called after all tools are tested.
   */
  async cleanup(): Promise<void> {
    // Close MCP client (this will also close the transport and process)
    if (this.client) {
      try {
        await this.client.close();
      } catch (_error) {
        // Ignore cleanup errors
      }
      this.client = null;
    }

    // Close transport explicitly (StdioClientTransport manages the process internally)
    if (this.transport) {
      try {
        // The transport's process is managed internally and will be closed
        // when the client is closed, but we can close it explicitly if needed
        if (
          'close' in this.transport &&
          typeof this.transport.close === 'function'
        ) {
          await this.transport.close();
        }
      } catch (_error) {
        // Ignore cleanup errors
      }
      this.transport = null;
    }

    // Clean up temp directory
    if (this.tempDir) {
      try {
        await fs.promises.rm(this.tempDir, { recursive: true, force: true });
      } catch (_error) {
        // Ignore cleanup errors
      }
      this.tempDir = null;
    }

    this.initialized = false;
  }

  /**
   * Check if sandbox is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the temp directory path.
   */
  getTempDir(): string | null {
    return this.tempDir;
  }
}
