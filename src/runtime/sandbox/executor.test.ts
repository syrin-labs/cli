/**
 * Tests for sandbox executor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { SandboxExecutor } from '@/runtime/sandbox';

// Mock child_process
vi.mock('child_process', () => {
  const mockProcess = {
    on: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
    killed: false,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };

  return {
    default: {
      spawn: vi.fn(() => mockProcess),
    },
    spawn: vi.fn(() => mockProcess),
  };
});

// Mock MCP SDK
// Track if we should fail listTools (for testing initialization errors)
let shouldFailListTools = false;

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(function MockClient() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'test output' }],
      }),
      listTools: vi.fn().mockImplementation(() => {
        if (shouldFailListTools) {
          return Promise.reject(new Error('Command not found'));
        }
        return Promise.resolve({ tools: [] });
      }),
      onerror: null,
    };
  }),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(function MockStdioClientTransport() {
    return {};
  }),
}));

describe('SandboxExecutor', () => {
  let tempDir: string;
  let executor: SandboxExecutor;

  beforeEach(() => {
    shouldFailListTools = false;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-test-'));
    executor = new SandboxExecutor({
      timeout: 5000,
      mcpCommand: 'echo "test"',
      projectRoot: tempDir,
    });
  });

  afterEach(async () => {
    if (executor && executor.isInitialized()) {
      await executor.cleanup();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should initialize sandbox and create temp directory', async () => {
      await executor.initialize();

      expect(executor.isInitialized()).toBe(true);
      const tempDirPath = executor.getTempDir();
      expect(tempDirPath).toBeTruthy();
      if (tempDirPath) {
        expect(fs.existsSync(tempDirPath)).toBe(true);
      }
    });

    it('should handle initialization errors gracefully', async () => {
      // Set flag to make listTools fail for this test
      shouldFailListTools = true;

      try {
        const badExecutor = new SandboxExecutor({
          timeout: 5000,
          mcpCommand: 'nonexistent-command-that-fails',
          projectRoot: tempDir,
        });

        await expect(badExecutor.initialize()).rejects.toThrow();
      } finally {
        // Reset flag for other tests
        shouldFailListTools = false;
      }
    }, 10000); // Increase timeout to 10s to allow for polling retries (maxWaitTime is 5s)
  });

  describe('tool execution', () => {
    it('should execute tool with given inputs', async () => {
      await executor.initialize();

      const inputs = [{ test: 'value' }];
      const results = await executor.executeTool('test_tool', inputs);

      expect(results).toHaveLength(1);
      expect(results[0]?.output).toBeDefined();
    });

    it('should handle multiple inputs', async () => {
      await executor.initialize();

      const inputs = [{ test: 'value1' }, { test: 'value2' }];
      const results = await executor.executeTool('test_tool', inputs);

      expect(results).toHaveLength(2);
    });

    it('should track execution time', async () => {
      await executor.initialize();

      const inputs = [{ test: 'value' }];
      const results = await executor.executeTool('test_tool', inputs);

      expect(results[0]?.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on cleanup', async () => {
      await executor.initialize();
      const tempDirPath = executor.getTempDir();

      await executor.cleanup();

      expect(executor.isInitialized()).toBe(false);
      if (tempDirPath) {
        // Temp dir should be cleaned up
        expect(fs.existsSync(tempDirPath)).toBe(false);
      }
    });

    it('should handle cleanup when not initialized', async () => {
      await expect(executor.cleanup()).resolves.not.toThrow();
    });
  });

  describe('process reuse', () => {
    it('should reuse same process for multiple tool executions', async () => {
      await executor.initialize();

      const { spawn } = await import('child_process');
      const spawnCallCount = vi.mocked(spawn).mock.calls.length;

      // Execute multiple tools
      await executor.executeTool('tool1', [{ input: 'value1' }]);
      await executor.executeTool('tool2', [{ input: 'value2' }]);
      await executor.executeTool('tool3', [{ input: 'value3' }]);

      // Process should only be spawned once
      expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCallCount);
    });
  });
});
