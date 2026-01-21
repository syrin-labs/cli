/**
 * Tests for `syrin config` command implementation.
 * Tests all config subcommands: set, get, list, show, edit, edit-env, setup, set-default, remove.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  executeConfigSet,
  executeConfigGet,
  executeConfigList,
  executeConfigShow,
  executeConfigSetDefault,
  executeConfigRemove,
} from './config';
import { loadConfigOptional, saveLocalConfig } from '@/config/loader';
import {
  loadGlobalConfig,
  saveGlobalConfig,
  globalConfigExists,
} from '@/config/global-loader';
import { Paths } from '@/constants';
import {
  makeSyrinVersion,
  makeAgentName,
  makeAPIKey,
  makeModelName,
} from '@/types/factories';
import type { SyrinConfig, GlobalSyrinConfig } from '@/config/types';

// Mock dependencies
vi.mock('@/config/loader');
vi.mock('@/config/global-loader');
vi.mock('@/utils/editor');
vi.mock('@/config/env-templates');
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

// Note: We can't mock fs directly because detectConfigContext uses require('fs')
// Instead, we'll mock globalConfigExists which is used in the detection

describe('Config Commands', () => {
  let tempDir: string;
  let originalCwd: string;
  let mockLocalConfig: SyrinConfig;
  let mockGlobalConfig: GlobalSyrinConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-config-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Setup default mocks
    mockLocalConfig = {
      version: makeSyrinVersion('1.0'),
      project_name: 'test-project' as any,
      agent_name: makeAgentName('test-agent'),
      transport: 'stdio' as const,
      script: 'python server.py' as any,
      llm: {
        openai: {
          API_KEY: makeAPIKey('OPENAI_API_KEY'),
          MODEL_NAME: makeModelName('gpt-4'),
          default: true,
        },
      },
    };

    mockGlobalConfig = {
      version: makeSyrinVersion('1.0'),
      project_name: 'GlobalSyrin' as any,
      agent_name: makeAgentName('global-agent'),
      llm: {
        openai: {
          API_KEY: makeAPIKey('OPENAI_API_KEY'),
          MODEL_NAME: makeModelName('gpt-4'),
          default: true,
        },
        claude: {
          API_KEY: makeAPIKey('ANTHROPIC_API_KEY'),
          MODEL_NAME: makeModelName('claude-3-5-sonnet'),
          default: false,
        },
      },
    };

    // Reset mocks
    vi.mocked(loadConfigOptional).mockReturnValue(null);
    vi.mocked(loadGlobalConfig).mockReturnValue(null);
    vi.mocked(globalConfigExists).mockReturnValue(false);
    vi.mocked(saveLocalConfig).mockClear();
    vi.mocked(saveGlobalConfig).mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('executeConfigSet', () => {
    describe('local config', () => {
      it('should set LLM provider API key', async () => {
        // Create local config file
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigSet('openai.api_key', 'NEW_API_KEY', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // API_KEY is wrapped in makeAPIKey, so we check the string value
        expect(String(savedConfig.llm.openai.API_KEY)).toBe('NEW_API_KEY');
      });

      it('should set LLM provider model name', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        // Create a mutable copy of the config
        const configCopy = JSON.parse(JSON.stringify(mockLocalConfig));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigSet('openai.model', 'gpt-4-turbo', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // MODEL_NAME is wrapped in makeModelName, so we check the string value
        expect(String(savedConfig.llm.openai.MODEL_NAME)).toBe('gpt-4-turbo');
      });

      it('should set agent_name', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        // Create a mutable copy of the config
        const configCopy = JSON.parse(JSON.stringify(mockLocalConfig));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigSet('agent_name', 'new-agent', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // agent_name is wrapped in makeAgentName, so we check the string value
        expect(String(savedConfig.agent_name)).toBe('new-agent');
      });

      it('should throw error if local config not found', async () => {
        vi.mocked(loadConfigOptional).mockReturnValue(null);
        vi.mocked(loadGlobalConfig).mockReturnValue(null);

        await expect(
          executeConfigSet('openai.api_key', 'value', {}, tempDir)
        ).rejects.toThrow('No config found');
      });
    });

    describe('global config', () => {
      it('should set LLM provider API key in global config', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigSet('openai.api_key', 'NEW_API_KEY', {
          global: true,
        });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.openai.API_KEY).toBe('NEW_API_KEY');
      });

      it('should set LLM provider model name in global config', async () => {
        // Create a mutable copy of the config
        const configCopy = JSON.parse(JSON.stringify(mockGlobalConfig));
        vi.mocked(loadGlobalConfig).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigSet('openai.model', 'gpt-4-turbo', { global: true });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // MODEL_NAME is wrapped in makeModelName, so we check the string value
        expect(String(savedConfig.llm.openai.MODEL_NAME)).toBe('gpt-4-turbo');
      });

      it('should set agent_name in global config', async () => {
        // Create a mutable copy of the config
        const configCopy = JSON.parse(JSON.stringify(mockGlobalConfig));
        vi.mocked(loadGlobalConfig).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigSet('agent_name', 'new-global-agent', {
          global: true,
        });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // agent_name is wrapped in makeAgentName, so we check the string value
        expect(String(savedConfig.agent_name)).toBe('new-global-agent');
      });

      it('should create new provider if it does not exist', async () => {
        // Create a mutable copy of the config
        const configCopy = JSON.parse(JSON.stringify(mockGlobalConfig));
        vi.mocked(loadGlobalConfig).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigSet('ollama.model', 'llama2', { global: true });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.ollama).toBeDefined();
        // MODEL_NAME is wrapped in makeModelName, so we check the string value
        expect(String(savedConfig.llm.ollama.MODEL_NAME)).toBe('llama2');
      });

      it('should throw error if global config not found', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(null);

        await expect(
          executeConfigSet('openai.api_key', 'value', { global: true })
        ).rejects.toThrow('No global config found');
      });
    });
  });

  describe('executeConfigGet', () => {
    describe('local config', () => {
      it('should get LLM provider API key', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('openai.api_key', {}, tempDir);

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('OPENAI_API_KEY')
        );
      });

      it('should get LLM provider model name', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('openai.model', {}, tempDir);

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('gpt-4')
        );
      });

      it('should get agent_name', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('agent_name', {}, tempDir);

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('test-agent')
        );
      });

      it('should throw error if local config not found', async () => {
        vi.mocked(loadConfigOptional).mockReturnValue(null);
        vi.mocked(loadGlobalConfig).mockReturnValue(null);

        await expect(
          executeConfigGet('openai.api_key', {}, tempDir)
        ).rejects.toThrow('No config found');
      });
    });

    describe('global config', () => {
      it('should get LLM provider API key from global config', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('openai.api_key', { global: true });

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('OPENAI_API_KEY')
        );
      });

      it('should get LLM provider model name from global config', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('openai.model', { global: true });

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('gpt-4')
        );
      });

      it('should get agent_name from global config', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigGet('agent_name', { global: true });

        expect(log.plain).toHaveBeenCalledWith(
          expect.stringContaining('global-agent')
        );
      });

      it('should handle non-existent key gracefully', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const exitSpy = vi
          .spyOn(process, 'exit')
          .mockImplementation((() => {}) as never);

        await executeConfigGet('nonexistent.key', { global: true });

        expect(exitSpy).toHaveBeenCalledWith(1);
        exitSpy.mockRestore();
      });
    });
  });

  describe('executeConfigList', () => {
    describe('local config', () => {
      it('should list all configuration values', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigList({}, tempDir);

        // Check that displayConfigList was called (which uses labelValue, heading, plain)
        expect(log.labelValue).toHaveBeenCalled();
        expect(log.heading).toHaveBeenCalled();
        expect(log.plain).toHaveBeenCalled();
        // Check that provider names are in the output (via log.label calls)
        const labelCalls = vi
          .mocked(log.label)
          .mock.calls.map(call => call[0])
          .join('\n');
        expect(labelCalls).toContain('openai');
        // Check that model name is in the output (via log.labelValue calls)
        const labelValueCalls = vi
          .mocked(log.labelValue)
          .mock.calls.map(call => call.join(' '))
          .join('\n');
        expect(labelValueCalls).toContain('gpt-4');
      });

      it('should throw error if local config not found', async () => {
        vi.mocked(loadConfigOptional).mockReturnValue(null);
        vi.mocked(loadGlobalConfig).mockReturnValue(null);

        await expect(executeConfigList({}, tempDir)).rejects.toThrow(
          'No config found'
        );
      });
    });

    describe('global config', () => {
      it('should list all global configuration values', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
        const { log } = await import('@/utils/logger');

        await executeConfigList({ global: true });

        // Check that displayConfigList was called (which uses labelValue, heading, plain)
        expect(log.labelValue).toHaveBeenCalled();
        expect(log.heading).toHaveBeenCalled();
        // Check that provider names are in the output (via log.label calls)
        const labelCalls = vi
          .mocked(log.label)
          .mock.calls.map(call => call[0])
          .join('\n');
        expect(labelCalls).toContain('openai');
        expect(labelCalls).toContain('claude');
      });

      it('should throw error if global config not found', async () => {
        vi.mocked(loadGlobalConfig).mockReturnValue(null);

        await expect(executeConfigList({ global: true })).rejects.toThrow(
          'No global config found'
        );
      });
    });
  });

  describe('executeConfigShow', () => {
    it('should show full local configuration', async () => {
      const configPath = path.join(tempDir, Paths.CONFIG_FILE);
      fs.writeFileSync(configPath, 'version: "1.0"');

      vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
      const { log } = await import('@/utils/logger');

      await executeConfigShow({}, tempDir);

      // executeConfigShow calls executeConfigList which uses the presentation layer
      expect(log.labelValue).toHaveBeenCalled();
    });

    it('should show full global configuration', async () => {
      vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
      const { log } = await import('@/utils/logger');

      await executeConfigShow({ global: true });

      // executeConfigShow calls executeConfigList which uses the presentation layer
      expect(log.labelValue).toHaveBeenCalled();
    });
  });

  describe('executeConfigSetDefault', () => {
    describe('local config', () => {
      it('should set default LLM provider', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        vi.mocked(loadConfigOptional).mockReturnValue(mockLocalConfig);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigSetDefault('openai', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.openai.default).toBe(true);
      });

      it('should unset other providers when setting new default', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        const configWithMultiple: SyrinConfig = {
          ...mockLocalConfig,
          llm: {
            openai: {
              API_KEY: makeAPIKey('OPENAI_API_KEY'),
              MODEL_NAME: makeModelName('gpt-4'),
              default: true,
            },
            claude: {
              API_KEY: makeAPIKey('ANTHROPIC_API_KEY'),
              MODEL_NAME: makeModelName('claude-3-5-sonnet'),
              default: false,
            },
          },
        };

        // Create a mutable copy
        const configCopy = JSON.parse(JSON.stringify(configWithMultiple));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigSetDefault('claude', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.openai.default).toBe(false);
        expect(savedConfig.llm.claude.default).toBe(true);
      });

      it('should throw error if provider does not exist', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        // Create a mutable copy
        const configCopy = JSON.parse(JSON.stringify(mockLocalConfig));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);

        await expect(
          executeConfigSetDefault('nonexistent', {}, tempDir)
        ).rejects.toThrow();
      });
    });

    describe('global config', () => {
      it('should set default LLM provider in global config', async () => {
        // Create a mutable copy with multiple providers
        const configWithMultiple = {
          ...mockGlobalConfig,
          llm: {
            ...mockGlobalConfig.llm,
            claude: {
              API_KEY: makeAPIKey('ANTHROPIC_API_KEY'),
              MODEL_NAME: makeModelName('claude-3-5-sonnet'),
              default: false,
            },
          },
        };
        const configCopy = JSON.parse(JSON.stringify(configWithMultiple));
        vi.mocked(loadGlobalConfig).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigSetDefault('claude', { global: true });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.openai.default).toBe(false);
        expect(savedConfig.llm.claude.default).toBe(true);
      });
    });
  });

  describe('executeConfigRemove', () => {
    describe('local config', () => {
      it('should remove LLM provider', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        const configWithMultiple: SyrinConfig = {
          ...mockLocalConfig,
          llm: {
            openai: {
              API_KEY: makeAPIKey('OPENAI_API_KEY'),
              MODEL_NAME: makeModelName('gpt-4'),
              default: true,
            },
            claude: {
              API_KEY: makeAPIKey('ANTHROPIC_API_KEY'),
              MODEL_NAME: makeModelName('claude-3-5-sonnet'),
              default: false,
            },
          },
        };

        // Create a mutable copy
        const configCopy = JSON.parse(JSON.stringify(configWithMultiple));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveLocalConfig);

        await executeConfigRemove('claude', {}, tempDir);

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        // Check that claude is not in the saved config
        expect(savedConfig.llm.claude).toBeUndefined();
        expect(savedConfig.llm.openai).toBeDefined();
      });

      it('should throw error if trying to remove default provider', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        // Create a mutable copy
        const configCopy = JSON.parse(JSON.stringify(mockLocalConfig));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);

        // When there's only one provider, it throws a different error
        await expect(
          executeConfigRemove('openai', {}, tempDir)
        ).rejects.toThrow('Cannot remove the last LLM provider');
      });

      it('should throw error if provider does not exist', async () => {
        const configPath = path.join(tempDir, Paths.CONFIG_FILE);
        fs.writeFileSync(configPath, 'version: "1.0"');

        // Create a mutable copy
        const configCopy = JSON.parse(JSON.stringify(mockLocalConfig));
        vi.mocked(loadConfigOptional).mockReturnValue(configCopy);

        await expect(
          executeConfigRemove('nonexistent', {}, tempDir)
        ).rejects.toThrow('not found');
      });
    });

    describe('global config', () => {
      it('should remove LLM provider from global config', async () => {
        // Create a mutable copy with multiple providers
        const configWithMultiple = {
          ...mockGlobalConfig,
          llm: {
            ...mockGlobalConfig.llm,
            claude: {
              API_KEY: makeAPIKey('ANTHROPIC_API_KEY'),
              MODEL_NAME: makeModelName('claude-3-5-sonnet'),
              default: false,
            },
          },
        };
        const configCopy = JSON.parse(JSON.stringify(configWithMultiple));
        vi.mocked(loadGlobalConfig).mockReturnValue(configCopy);
        const saveSpy = vi.mocked(saveGlobalConfig);

        await executeConfigRemove('claude', { global: true });

        expect(saveSpy).toHaveBeenCalled();
        const savedConfig = saveSpy.mock.calls[0]![0];
        expect(savedConfig.llm.claude).toBeUndefined();
        expect(savedConfig.llm.openai).toBeDefined();
      });
    });
  });

  describe('Context detection', () => {
    it('should prefer local config when both exist', async () => {
      // Create a local config file to trigger local context detection
      const configPath = path.join(tempDir, Paths.CONFIG_FILE);
      fs.writeFileSync(configPath, 'version: "1.0"');

      // Mock globalConfigExists to return true (both configs exist)
      vi.mocked(globalConfigExists).mockReturnValue(true);

      // Create mutable copies
      const localConfigCopy = JSON.parse(JSON.stringify(mockLocalConfig));
      const globalConfigCopy = JSON.parse(JSON.stringify(mockGlobalConfig));
      vi.mocked(loadConfigOptional).mockReturnValue(localConfigCopy);
      vi.mocked(loadGlobalConfig).mockReturnValue(globalConfigCopy);
      const saveSpy = vi.mocked(saveLocalConfig);

      await executeConfigSet('openai.api_key', 'value', {}, tempDir);

      expect(saveSpy).toHaveBeenCalled();
      expect(vi.mocked(saveGlobalConfig)).not.toHaveBeenCalled();
    });

    it('should use global config when local does not exist and --global flag is set', async () => {
      // Ensure no local config file
      const configPath = path.join(tempDir, Paths.CONFIG_FILE);
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      vi.mocked(loadConfigOptional).mockReturnValue(null);
      vi.mocked(loadGlobalConfig).mockReturnValue(mockGlobalConfig);
      const saveSpy = vi.mocked(saveGlobalConfig);

      await executeConfigSet('openai.api_key', 'value', { global: true });

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should throw error when neither config exists', async () => {
      // Ensure no local config file exists
      const configPath = path.join(tempDir, Paths.CONFIG_FILE);
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      vi.mocked(globalConfigExists).mockReturnValue(false);
      vi.mocked(loadConfigOptional).mockReturnValue(null);
      vi.mocked(loadGlobalConfig).mockReturnValue(null);

      await expect(
        executeConfigSet('openai.api_key', 'value', {}, tempDir)
      ).rejects.toThrow('No config found');
    });
  });
});
