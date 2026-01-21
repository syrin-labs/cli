/**
 * Tests for `syrin init` command.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { executeInit } from './init';
import { generateConfigFile, isProjectInitialized } from '@/config/generator';
import { ensureGitignorePattern } from '@/utils/gitignore';
import {
  getDefaultInitOptions,
  promptInitOptions,
} from '@/cli/prompts/init-prompt';
import { showVersionBanner } from '@/cli/utils/version-banner';
import { Paths } from '@/constants';

// Mock dependencies
vi.mock('@/config/generator');
vi.mock('@/utils/gitignore');
vi.mock('@/cli/prompts/init-prompt');
vi.mock('@/cli/utils/version-banner');
vi.mock('@/presentation/init-ui', () => ({
  displayAlreadyInitialized: vi.fn(),
  displayInitSuccess: vi.fn(),
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
    styleText: vi.fn((text) => text),
  },
}));

describe('executeInit', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('when project is already initialized', () => {
    it('should display already initialized message and return early', async () => {
      vi.mocked(isProjectInitialized).mockReturnValue(true);

      await executeInit();

      // The function uses process.cwd() which may resolve symlinks differently
      // So we check that it was called with a path that contains the tempDir basename
      expect(isProjectInitialized).toHaveBeenCalledWith(
        expect.stringContaining(path.basename(tempDir))
      );
      expect(generateConfigFile).not.toHaveBeenCalled();
    });
  });

  describe('when project is not initialized', () => {
    beforeEach(() => {
      vi.mocked(isProjectInitialized).mockReturnValue(false);
      vi.mocked(showVersionBanner).mockResolvedValue(undefined);
    });

    describe('with --yes flag (non-interactive mode)', () => {
      it('should initialize with default options', async () => {
        const defaultOptions = {
          projectName: 'test-project',
          agentName: 'test-agent',
          transport: 'stdio' as const,
          script: 'python server.py',
          llmProviders: ['openai'],
        };

        vi.mocked(getDefaultInitOptions).mockReturnValue(defaultOptions);
        vi.mocked(generateConfigFile).mockReturnValue(
          path.join(tempDir, Paths.CONFIG_FILE)
        );
        vi.mocked(ensureGitignorePattern).mockResolvedValue(true);

        await executeInit({ yes: true });

        expect(getDefaultInitOptions).toHaveBeenCalledWith(
          expect.stringContaining(path.basename(tempDir))
        );
        expect(promptInitOptions).not.toHaveBeenCalled();
        expect(generateConfigFile).toHaveBeenCalledWith(
          defaultOptions,
          expect.stringContaining(path.basename(tempDir))
        );
      });

      it('should update .gitignore with required patterns', async () => {
        const defaultOptions = {
          projectName: 'test-project',
          agentName: 'test-agent',
          transport: 'stdio' as const,
          script: 'python server.py',
          llmProviders: ['openai'],
        };

        vi.mocked(getDefaultInitOptions).mockReturnValue(defaultOptions);
        vi.mocked(generateConfigFile).mockReturnValue(
          path.join(tempDir, Paths.CONFIG_FILE)
        );
        vi.mocked(ensureGitignorePattern).mockResolvedValue(true);

        await executeInit({ yes: true });

        expect(ensureGitignorePattern).toHaveBeenCalledWith(
          expect.stringContaining(path.basename(tempDir)),
          Paths.EVENTS_DIR
        );
        expect(ensureGitignorePattern).toHaveBeenCalledWith(
          expect.stringContaining(path.basename(tempDir)),
          Paths.DEV_HISTORY_FILE
        );
        expect(ensureGitignorePattern).toHaveBeenCalledWith(
          expect.stringContaining(path.basename(tempDir)),
          Paths.DATA_DIR
        );
      });

      it('should handle .gitignore update failures gracefully', async () => {
        const defaultOptions = {
          projectName: 'test-project',
          agentName: 'test-agent',
          transport: 'stdio' as const,
          script: 'python server.py',
          llmProviders: ['openai'],
        };

        vi.mocked(getDefaultInitOptions).mockReturnValue(defaultOptions);
        vi.mocked(generateConfigFile).mockReturnValue(
          path.join(tempDir, Paths.CONFIG_FILE)
        );
        vi.mocked(ensureGitignorePattern).mockRejectedValue(
          new Error('Permission denied')
        );

        // Should not throw
        await expect(executeInit({ yes: true })).resolves.not.toThrow();
      });
    });

    describe('without --yes flag (interactive mode)', () => {
      it('should prompt user for options', async () => {
        const userOptions = {
          projectName: 'my-project',
          agentName: 'my-agent',
          transport: 'http' as const,
          mcpUrl: 'http://localhost:8000/mcp',
          script: '',
          llmProviders: ['claude'],
        };

        vi.mocked(promptInitOptions).mockResolvedValue(userOptions);
        vi.mocked(generateConfigFile).mockReturnValue(
          path.join(tempDir, Paths.CONFIG_FILE)
        );
        vi.mocked(ensureGitignorePattern).mockResolvedValue(true);

        await executeInit({ yes: false });

        expect(promptInitOptions).toHaveBeenCalled();
        expect(generateConfigFile).toHaveBeenCalledWith(
          userOptions,
          expect.stringContaining(path.basename(tempDir))
        );
      });

      it('should handle user cancellation gracefully', async () => {
        const cancelError = new Error('User cancelled');
        cancelError.name = 'ExitPromptError';

        vi.mocked(promptInitOptions).mockRejectedValue(cancelError);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        await expect(executeInit({ yes: false })).rejects.toThrow(
          'process.exit called'
        );

        expect(exitSpy).toHaveBeenCalledWith(0);
        exitSpy.mockRestore();
      });
    });

    describe('with custom project root', () => {
      it('should use provided project root', async () => {
        const customRoot = path.join(tempDir, 'custom-project');
        fs.mkdirSync(customRoot, { recursive: true });

        const defaultOptions = {
          projectName: 'test-project',
          agentName: 'test-agent',
          transport: 'stdio' as const,
          script: 'python server.py',
          llmProviders: ['openai'],
        };

        vi.mocked(getDefaultInitOptions).mockReturnValue(defaultOptions);
        vi.mocked(generateConfigFile).mockReturnValue(
          path.join(customRoot, Paths.CONFIG_FILE)
        );
        vi.mocked(ensureGitignorePattern).mockResolvedValue(true);

        await executeInit({ yes: true, projectRoot: customRoot });

        expect(isProjectInitialized).toHaveBeenCalledWith(customRoot);
        expect(generateConfigFile).toHaveBeenCalledWith(
          defaultOptions,
          customRoot
        );
      });
    });

    describe('error handling', () => {
      it('should throw ConfigurationError when config generation fails', async () => {
        vi.mocked(getDefaultInitOptions).mockReturnValue({
          projectName: 'test',
          agentName: 'test',
          transport: 'stdio' as const,
          script: 'test',
          llmProviders: [],
        });
        vi.mocked(generateConfigFile).mockImplementation(() => {
          throw new Error('Failed to write config');
        });

        await expect(executeInit({ yes: true })).rejects.toThrow();
      });
    });
  });
});
