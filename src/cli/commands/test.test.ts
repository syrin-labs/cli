/**
 * Tests for `syrin test` command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTest } from './test';
import { connectMCP } from '@/runtime/mcp';
import { resolveTransportConfig } from '@/cli/utils';

// Mock dependencies
vi.mock('@/runtime/mcp');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    resolveTransportConfig: vi.fn(),
    handleCommandError: vi.fn((error) => {
      throw error;
    }),
  };
});
vi.mock('@/presentation/test-ui', () => ({
  displayTestResults: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
  log: {
    blank: vi.fn(),
    error: vi.fn(),
  },
}));

describe('executeTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      // When test succeeds, function completes normally (no exit)
      await executeTest({});

      expect(resolveTransportConfig).toHaveBeenCalled();
      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'stdio',
        url: undefined,
        command: 'python server.py',
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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      try {
        await executeTest({});
      } catch (error) {
        // Expected to throw due to process.exit
      }

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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        transport: 'http',
        url: 'http://localhost:8000',
      });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'http',
        url: 'http://localhost:8000',
        command: undefined,
      });

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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        transport: 'stdio',
        script: 'python server.py',
      });

      expect(connectMCP).toHaveBeenCalledWith({
        transport: 'stdio',
        url: undefined,
        command: 'python server.py',
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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        url: 'http://custom-url:9000',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
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
      });

      vi.mocked(connectMCP).mockResolvedValue(mockResult);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await executeTest({
        script: 'custom-script.sh',
      });

      expect(resolveTransportConfig).toHaveBeenCalledWith({
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
      });

      vi.mocked(connectMCP).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(executeTest({})).rejects.toThrow('Connection failed');
    });

    it('should handle transport resolution errors', async () => {
      vi.mocked(resolveTransportConfig).mockImplementation(() => {
        throw new Error('Invalid transport configuration');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await executeTest({});
      } catch (error) {
        // Expected to throw due to process.exit
      }
      exitSpy.mockRestore();
    });
  });
});
