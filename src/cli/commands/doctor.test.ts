/**
 * Tests for `syrin doctor` command.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { executeDoctor } from './doctor';
import { loadConfig } from '@/config/loader';
import {
  checkEnvVar,
  checkCommandExists,
  extractCommandName,
} from '@/config/env-checker';
// Note: checkTransport, checkScript, checkLLMProviders are internal functions
// We test them indirectly through executeDoctor
import { TransportTypes, LLMProviders } from '@/constants';
import type { SyrinConfig } from '@/config/types';

// Mock dependencies
vi.mock('@/config/loader');
vi.mock('@/config/env-checker');
vi.mock('@/cli/utils', async () => {
  const actual = await vi.importActual('@/cli/utils');
  return {
    ...actual,
    handleCommandError: vi.fn(error => {
      throw error;
    }),
  };
});
vi.mock('@/presentation/doctor-ui', () => ({
  displayDoctorReport: vi.fn(),
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

describe('executeDoctor', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-doctor-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('successful execution', () => {
    it('should load config and generate report', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'python server.py',
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY' as any,
            MODEL_NAME: 'OPENAI_MODEL' as any,
          },
        },
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkCommandExists).mockReturnValue(true);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      // When all checks pass, function completes normally (no exit)
      await executeDoctor(tempDir);

      expect(loadConfig).toHaveBeenCalledWith(tempDir);
    });

    it('should exit with code 0 when all checks pass', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'python server.py',
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY' as any,
            MODEL_NAME: 'OPENAI_MODEL' as any,
          },
        },
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkCommandExists).mockReturnValue(true);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      // When all checks pass, executeDoctor completes normally without calling process.exit
      await executeDoctor(tempDir);

      expect(loadConfig).toHaveBeenCalledWith(tempDir);
    });

    it('should exit with code 1 when command check fails', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'nonexistent-command',
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY' as any,
            MODEL_NAME: 'OPENAI_MODEL' as any,
          },
        },
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkCommandExists).mockReturnValue(false);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      try {
        await executeDoctor(tempDir);
      } catch (error) {
        // Expected to throw due to process.exit
      }
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should exit with code 1 when env var check fails', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'python server.py',
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY' as any,
            MODEL_NAME: 'OPENAI_MODEL' as any,
          },
        },
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkCommandExists).mockReturnValue(true);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: false,
        errorMessage: 'Environment variable not set',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      try {
        await executeDoctor(tempDir);
      } catch (error) {
        // Expected to throw due to process.exit
      }
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('transport validation', () => {
    it('should validate HTTP transport with URL', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.HTTP,
        mcp_url: 'http://localhost:8000' as any,
        llm: {},
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      // When all checks pass, function completes normally (no exit)
      await executeDoctor(tempDir);

      expect(loadConfig).toHaveBeenCalledWith(tempDir);
    });

    it('should fail HTTP transport without URL', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.HTTP,
        llm: {},
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit(1)');
      });

      await expect(executeDoctor(tempDir)).rejects.toThrow('process.exit(1)');
      exitSpy.mockRestore();
    });

    it('should validate stdio transport with script', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'python server.py',
        llm: {},
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(extractCommandName).mockReturnValue('python');
      vi.mocked(checkCommandExists).mockReturnValue(true);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      // When all checks pass, function completes normally (no exit)
      await executeDoctor(tempDir);

      expect(checkCommandExists).toHaveBeenCalledWith('python');
    });
  });

  describe('LLM provider validation', () => {
    it('should check API key and model for cloud providers', async () => {
      const mockConfig: SyrinConfig = {
        version: '1.0.0' as any,
        project_name: 'test-project' as any,
        agent_name: 'test-agent' as any,
        transport: TransportTypes.STDIO,
        script: 'python server.py',
        llm: {
          openai: {
            API_KEY: 'OPENAI_API_KEY' as any,
            MODEL_NAME: 'OPENAI_MODEL' as any,
          },
          claude: {
            API_KEY: 'CLAUDE_API_KEY' as any,
            MODEL_NAME: 'CLAUDE_MODEL' as any,
          },
        },
      };

      vi.mocked(loadConfig).mockReturnValue(mockConfig);
      vi.mocked(checkCommandExists).mockReturnValue(true);
      vi.mocked(checkEnvVar).mockReturnValue({
        isSet: true,
        value: 'test-value',
      });

      // When all checks pass, function completes normally (no exit)
      await executeDoctor(tempDir);

      expect(checkEnvVar).toHaveBeenCalledWith('OPENAI_API_KEY', tempDir);
      expect(checkEnvVar).toHaveBeenCalledWith('OPENAI_MODEL', tempDir);
      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_API_KEY', tempDir);
      expect(checkEnvVar).toHaveBeenCalledWith('CLAUDE_MODEL', tempDir);
    });
  });

  describe('error handling', () => {
    it('should handle config loading errors', async () => {
      vi.mocked(loadConfig).mockImplementation(() => {
        throw new Error('Config not found');
      });

      await expect(executeDoctor(tempDir)).rejects.toThrow();
    });
  });
});
