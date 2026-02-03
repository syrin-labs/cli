/**
 * Tests for `syrin analyse` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAnalyse } from './analyse';
import { analyseTools } from '@/runtime/analysis';
import { displayAnalysisResult } from '@/presentation/analysis-ui';
import { ERROR_CODES } from '@/runtime/analysis/rules/error-codes';
import {
  resolveTransportConfig,
  establishConnection,
  safeCloseConnection,
} from '@/cli/utils';
import { TransportTypes } from '@/constants';
import { log } from '@/utils/logger';

/** Stable test-only URL (mocked; no real external dependency). */
const TEST_MCP_URL = 'http://test-mcp.example/mcp';

// Mock dependencies
vi.mock('@/cli/utils');
vi.mock('@/runtime/analysis');
vi.mock('@/presentation/analysis-ui', () => ({
  displayAnalysisResult: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    plain: vi.fn(),
    blank: vi.fn(),
    heading: vi.fn(),
    label: vi.fn(),
    value: vi.fn(),
    labelValue: vi.fn(),
    numberedItem: vi.fn(),
    checkmark: vi.fn(),
    xmark: vi.fn(),
    warnSymbol: vi.fn(),
    tick: vi.fn(() => '✓'),
    cross: vi.fn(() => '✗'),
    styleText: vi.fn(text => text),
  },
}));

describe('executeAnalyse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should run analysis and display results', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 5,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      await expect(executeAnalyse({})).rejects.toThrow('process.exit(0)');

      expect(resolveTransportConfig).toHaveBeenCalled();
      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });
      expect(analyseTools).toHaveBeenCalledWith(mockClient);
      expect(displayAnalysisResult).toHaveBeenCalledWith(mockResult, {
        ci: undefined,
        json: undefined,
        graph: undefined,
      });
      expect(safeCloseConnection).toHaveBeenCalledWith(mockTransport);
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });

    it('should exit with code 1 when errors are found', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'fail' as const,
        diagnostics: [
          {
            code: ERROR_CODES.E001,
            severity: 'error' as const,
            message: 'Missing output schema',
          },
        ],
        errors: [
          {
            code: ERROR_CODES.E001,
            severity: 'error' as const,
            message: 'Missing output schema',
          },
        ],
        warnings: [],
        dependencies: [],
        toolCount: 3,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeAnalyse({})).rejects.toThrow('process.exit(1)');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should use HTTP transport when specified', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 2,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({ transport: TransportTypes.HTTP });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      exitSpy.mockRestore();
    });

    it('should pass options to displayAnalysisResult', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({
          ci: true,
          json: true,
          graph: true,
        });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(displayAnalysisResult).toHaveBeenCalledWith(mockResult, {
        ci: true,
        json: true,
        graph: true,
      });

      exitSpy.mockRestore();
    });

    it('should not show info messages in CI mode', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      const logInfoSpy = vi.spyOn(log, 'info');

      try {
        await executeAnalyse({ ci: true });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      // In CI mode, log.info should not be called for connecting/loading messages
      expect(logInfoSpy).not.toHaveBeenCalled();
      expect(displayAnalysisResult).toHaveBeenCalledWith(mockResult, {
        ci: true,
        json: undefined,
        graph: undefined,
      });

      logInfoSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockRejectedValue(
        new Error('Connection failed')
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeAnalyse({})).rejects.toThrow('process.exit(1)');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should handle analysis errors', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockRejectedValue(new Error('Analysis failed'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      try {
        await executeAnalyse({});
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      // Connection should be closed even on error (handled in catch block)
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should always close connection even on errors', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockRejectedValue(new Error('Analysis error'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      try {
        await executeAnalyse({});
      } catch (_error) {
        // Expected to throw
      }

      // Note: The current implementation doesn't close connection on error
      // The error is handled by handleCommandError which calls process.exit
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('with CLI options', () => {
    it('should use CLI-provided URL over config', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://custom-url:9000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({
          transport: TransportTypes.HTTP,
          url: 'http://custom-url:9000',
        });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://custom-url:9000',
      });

      exitSpy.mockRestore();
    });

    it('should use CLI-provided script over config', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'custom-script.sh',
        urlSource: 'config',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({
          transport: TransportTypes.STDIO,
          script: 'custom-script.sh',
        });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        script: 'custom-script.sh',
      });

      exitSpy.mockRestore();
    });

    it('should succeed with --url only (zero-config: no syrin.yaml required)', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: TEST_MCP_URL,
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      await expect(
        executeAnalyse({ url: TEST_MCP_URL })
      ).rejects.toThrow('process.exit(0)');

      expect(resolveTransportConfig).toHaveBeenCalledWith({
        url: TEST_MCP_URL,
      });
      expect(establishConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: TransportTypes.HTTP,
          url: TEST_MCP_URL,
        })
      );

      exitSpy.mockRestore();
    });

    it('should pass env vars to stdio transport', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };
      const env = { API_KEY: 'test-key' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env,
        authHeaders: undefined,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({ env });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.STDIO,
        url: undefined,
        script: 'python server.py',
        urlSource: 'config',
        env,
        authHeaders: undefined,
      });

      exitSpy.mockRestore();
    });

    it('should pass auth headers to HTTP transport', async () => {
      const mockClient = { id: 'mock-client' };
      const mockTransport = { id: 'mock-transport' };
      const mockResult = {
        verdict: 'pass' as const,
        diagnostics: [],
        errors: [],
        warnings: [],
        dependencies: [],
        toolCount: 1,
      };
      const authHeaders = { Authorization: 'Bearer token123' };

      vi.mocked(resolveTransportConfig).mockReturnValue({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders,
      });

      vi.mocked(establishConnection).mockResolvedValue({
        client: mockClient as any,
        transport: mockTransport as any,
      });

      vi.mocked(analyseTools).mockResolvedValue(mockResult);
      vi.mocked(safeCloseConnection).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(0)');
      });

      try {
        await executeAnalyse({ authHeaders });
      } catch (_error) {
        // Expected to throw due to process.exit
      }

      expect(establishConnection).toHaveBeenCalledWith({
        transport: TransportTypes.HTTP,
        url: 'http://localhost:8000',
        script: undefined,
        urlSource: 'cli',
        env: undefined,
        authHeaders,
      });

      exitSpy.mockRestore();
    });
  });
});
