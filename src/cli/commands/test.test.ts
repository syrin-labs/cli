/**
 * Tests for `syrin test` command.
 * Tests both connection testing (--connection) and tool validation (default).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTest } from './test';
import { connectMCP } from '@/runtime/mcp';
import { resolveTransportConfig } from '@/cli/utils';
import { TestOrchestrator } from '@/runtime/test/orchestrator';
import { ERROR_CODES } from '@/runtime/analysis/rules/error-codes';

// Mock dependencies
vi.mock('@/runtime/mcp');
vi.mock('@/runtime/test/orchestrator');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    resolveTransportConfig: vi.fn(),
    handleCommandError: vi.fn(error => {
      throw error;
    }),
  };
});
vi.mock('@/presentation/test-ui', () => ({
  displayTestResults: vi.fn(),
  formatCLIResults: vi.fn(),
  formatJSONResults: vi.fn(() => '{}'),
  formatCIResults: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
  log: {
    blank: vi.fn(),
    error: vi.fn(),
    plain: vi.fn(),
  },
}));

describe('executeTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connection testing mode (--connection)', () => {
    it('should test MCP connection and display results', async () => {
      const mockResult = {
        success: true,
        transport: 'stdio' as const,
        message: 'Connection successful',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'stdio' as const,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      // When test succeeds, function completes normally (no exit)
      await executeTest({ connection: true });

      expect(resolveTransportConfig).toHaveBeenCalled();
      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'stdio',
        url: undefined,
        command: 'python server.py',
        env: undefined,
        headers: undefined,
      });
    });

    it('should exit with code 1 when test fails', async () => {
      const mockResult = {
        success: false,
        transport: 'http' as const,
        message: 'Connection failed',
        error: 'ECONNREFUSED',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'http' as const,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeTest({ connection: true })).rejects.toThrow();

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should use HTTP transport when specified', async () => {
      const mockResult = {
        success: true,
        transport: 'http' as const,
        message: 'Connection successful',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'http' as const,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        connection: true,
        transport: 'http',
        url: 'http://localhost:8000',
      });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'http',
        url: 'http://localhost:8000',
        command: undefined,
        env: undefined,
        headers: undefined,
      });

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('should use stdio transport when specified', async () => {
      const mockResult = {
        success: true,
        transport: 'stdio' as const,
        message: 'Connection successful',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'stdio' as const,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        connection: true,
        transport: 'stdio',
        script: 'python server.py',
      });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'stdio',
        url: undefined,
        command: 'python server.py',
        env: undefined,
        headers: undefined,
      });

      exitSpy.mockRestore();
    });

    it('should use CLI-provided URL over config', async () => {
      const mockResult = {
        success: true,
        transport: 'http' as const,
        message: 'Connection successful',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'http' as const,
        url: 'http://custom-url:9000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        connection: true,
        url: 'http://custom-url:9000',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        connection: true,
        url: 'http://custom-url:9000',
      });

      exitSpy.mockRestore();
    });

    it('should use CLI-provided script over config', async () => {
      const mockResult = {
        success: true,
        transport: 'stdio' as const,
        message: 'Connection successful',
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'stdio' as const,
        url: undefined,
        script: 'custom-script.sh',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        connection: true,
        script: 'custom-script.sh',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        connection: true,
        script: 'custom-script.sh',
      });

      exitSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'http' as const,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockRejectedValue(new Error('Connection failed'));

      await expect(executeTest({ connection: true })).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle transport resolution errors', async () => {
      vi.mocked(resolveTransportConfig).mockImplementation(() => {
        throw new Error('Invalid transport configuration');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await executeTest({ connection: true });
      } catch (_error) {
        // Expected to throw due to process.exit
      }
      exitSpy.mockRestore();
    });

    it('should pass env vars to stdio transport', async () => {
      const mockResult = {
        success: true,
        transport: 'stdio' as const,
        message: 'Connection successful',
      };

      const env = { API_KEY: 'test-key' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'stdio' as const,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env,
        authHeaders: undefined,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      await executeTest({ connection: true, env });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'stdio',
        url: undefined,
        command: 'python server.py',
        env,
        headers: undefined,
      });
    });

    it('should pass auth headers to HTTP transport', async () => {
      const mockResult = {
        success: true,
        transport: 'http' as const,
        message: 'Connection successful',
      };

      const authHeaders = { Authorization: 'Bearer token123' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: 'http' as const,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders,
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      await executeTest({ connection: true, authHeaders });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'http',
        url: 'http://localhost:8000',
        command: undefined,
        env: undefined,
        headers: authHeaders,
      });
    });
  });

  describe('tool validation mode (default)', () => {
    it('should run tool validation when connection flag is not set', async () => {
      const mockOrchestrator = {
        run: vi.fn().mockResolvedValue({
          verdict: 'pass',
          diagnostics: [],
          toolResults: [],
          toolsTested: 0,
          toolsPassed: 0,
          toolsFailed: 0,
        }),
      };

      vi.mocked(TestOrchestrator).mockImplementation(
        () => mockOrchestrator as any
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      await expect(executeTest({ projectRoot: '/tmp' })).rejects.toThrow();

      expect(TestOrchestrator).toHaveBeenCalled();
      expect(mockOrchestrator.run).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
    });

    it('should exit with code 1 when tool validation fails', async () => {
      const mockOrchestrator = {
        run: vi.fn().mockResolvedValue({
          verdict: 'fail',
          diagnostics: [
            {
              code: ERROR_CODES.E012,
              severity: 'error',
              message: 'Side effect detected',
            },
          ],
          toolResults: [],
          toolsTested: 1,
          toolsPassed: 0,
          toolsFailed: 1,
        }),
      };

      vi.mocked(TestOrchestrator).mockImplementation(
        () => mockOrchestrator as any
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeTest({ projectRoot: '/tmp' })).rejects.toThrow();

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should support --tool option', async () => {
      const mockOrchestrator = {
        run: vi.fn().mockResolvedValue({
          verdict: 'pass',
          diagnostics: [],
          toolResults: [],
          toolsTested: 1,
          toolsPassed: 1,
          toolsFailed: 0,
        }),
      };

      vi.mocked(TestOrchestrator).mockImplementation(
        () => mockOrchestrator as any
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      await expect(
        executeTest({ projectRoot: '/tmp', tool: 'fetch_user' })
      ).rejects.toThrow();

      expect(TestOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'fetch_user' })
      );
      exitSpy.mockRestore();
    });

    it('should support --strict option', async () => {
      const mockOrchestrator = {
        run: vi.fn().mockResolvedValue({
          verdict: 'fail', // Warnings become errors in strict mode
          diagnostics: [
            { code: 'W021', severity: 'error', message: 'Weak schema' },
          ],
          toolResults: [],
          toolsTested: 1,
          toolsPassed: 0,
          toolsFailed: 1,
        }),
      };

      vi.mocked(TestOrchestrator).mockImplementation(
        () => mockOrchestrator as any
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(
        executeTest({ projectRoot: '/tmp', strict: true })
      ).rejects.toThrow();

      expect(TestOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({ strictMode: true })
      );
      exitSpy.mockRestore();
    });

    it('should support --json option', async () => {
      const mockOrchestrator = {
        run: vi.fn().mockResolvedValue({
          verdict: 'pass',
          diagnostics: [],
          toolResults: [],
          toolsTested: 0,
          toolsPassed: 0,
          toolsFailed: 0,
        }),
      };

      vi.mocked(TestOrchestrator).mockImplementation(
        () => mockOrchestrator as any
      );

      const { formatJSONResults } = await import('@/presentation/test-ui');
      const { log } = await import('@/utils/logger');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      await expect(
        executeTest({ projectRoot: '/tmp', json: true })
      ).rejects.toThrow();

      expect(formatJSONResults).toHaveBeenCalled();
      expect(log.plain).toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });
});
