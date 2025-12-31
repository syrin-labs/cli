/**
 * Process spawning utilities for MCP servers.
 */

import * as childProcess from 'child_process';
import { log } from '@/utils/logger';

/**
 * Check if a command contains shell operators that require shell execution.
 * We only detect patterns that absolutely require a shell, avoiding false positives.
 * Essential operators: &&, ||, |, ;, $, $(, `
 */
export function requiresShellExecution(command: string): boolean {
  return (
    /\s+&&\s+/.test(command) || // Logical AND (e.g., "cmd1 && cmd2")
    /\s+\|\|\s+/.test(command) || // Logical OR (e.g., "cmd1 || cmd2")
    /\s+\|\s+/.test(command) || // Pipe (e.g., "cmd1 | cmd2")
    /\s+;\s+/.test(command) || // Command separator (e.g., "cmd1; cmd2")
    /\$\{/.test(command) || // Variable expansion ${VAR}
    /\$\(/.test(command) || // Command substitution $(command)
    /\$\w+/.test(command) || // Variable reference $VAR
    /`[^`]*`/.test(command) // Command substitution with backticks
  );
}

/**
 * Parse a command into executable and arguments.
 * Handles shell operators by wrapping in shell execution.
 */
export function parseCommand(command: string): {
  executable: string;
  args: string[];
} {
  const needsShell = requiresShellExecution(command);

  if (needsShell) {
    // Command contains shell operators - run through shell
    return {
      executable: process.env.SHELL || '/bin/sh',
      args: ['-c', command],
    };
  }

  // Simple command - split and execute directly
  const parts = command.split(/\s+/);
  return {
    executable: parts[0]!,
    args: parts.slice(1),
  };
}

/**
 * Set up log capture for a child process.
 * Captures stdout and stderr, formatting them appropriately.
 */
export function setupProcessLogCapture(
  process: childProcess.ChildProcess
): void {
  // Capture stdout logs
  process.stdout?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      log.plain(`[Server] ${message}`);
    }
  });

  // Capture stderr logs
  process.stderr?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      // Many tools (like Python/Uvicorn) write INFO logs to stderr, which is normal
      // Only prefix with [Server Error] if it actually looks like an error
      const isError = /ERROR|CRITICAL|FATAL|Exception|Traceback|Error:/i.test(
        message
      );
      const prefix = isError ? '[Server Error]' : '[Server]';
      if (isError) {
        log.error(`${prefix} ${message}`);
      } else {
        log.plain(`${prefix} ${message}`);
      }
    }
  });
}

/**
 * Spawn a process with proper configuration.
 */
export function spawnProcess(
  executable: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  }
): childProcess.ChildProcess {
  return childProcess.spawn(executable, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: options?.env ?? process.env,
    cwd: options?.cwd ?? process.cwd(),
    shell: false,
  });
}
