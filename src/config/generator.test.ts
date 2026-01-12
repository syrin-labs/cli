/**
 * Tests for configuration file generator.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateConfigFile, isProjectInitialized } from './generator';
import type { InitOptions } from './types';
import { Paths } from '../constants';

describe('generateConfigFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syrin-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic configuration', () => {
    it('should generate config file with stdio transport', () => {
      const options: InitOptions = {
        projectName: 'test-project',
        agentName: 'test-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);

      expect(configPath).toBe(path.join(tempDir, Paths.CONFIG_FILE));
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('version: "1.0.0"');
      expect(content).toContain('project_name: "test-project"');
      expect(content).toContain('agent_name: "test-agent"');
      expect(content).toContain('transport: "stdio"');
      expect(content).toContain('script: "python server.py"');
      expect(content).toContain('openai:');
      expect(content).toContain('API_KEY: "OPENAI_API_KEY"');
      expect(content).toContain('MODEL_NAME: "OPENAI_MODEL_NAME"');
      expect(content).toContain('default: true');
    });

    it('should generate config file with http transport', () => {
      const options: InitOptions = {
        projectName: 'http-project',
        agentName: 'http-agent',
        transport: 'http',
        mcpUrl: 'http://localhost:8000/mcp',
        script: '',
        llmProviders: {
          claude: {
            apiKey: 'CLAUDE_API_KEY',
            modelName: 'CLAUDE_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('transport: "http"');
      expect(content).toContain('mcp_url: "http://localhost:8000/mcp"');
      expect(content).toContain('claude:');
      expect(content).toContain('API_KEY: "CLAUDE_API_KEY"');
      expect(content).toContain('MODEL_NAME: "CLAUDE_MODEL_NAME"');
    });

    it('should generate config file without script for http transport', () => {
      const options: InitOptions = {
        projectName: 'no-script-project',
        agentName: 'no-script-agent',
        transport: 'http',
        mcpUrl: 'http://localhost:8000/mcp',
        script: '',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('# script: "python3 server.py"');
      expect(content).not.toContain('script: ""');
    });
  });

  describe('LLM provider configurations', () => {
    it('should generate config with OpenAI provider', () => {
      const options: InitOptions = {
        projectName: 'openai-project',
        agentName: 'openai-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('openai:');
      expect(content).toContain('API_KEY: "OPENAI_API_KEY"');
      expect(content).toContain('MODEL_NAME: "OPENAI_MODEL_NAME"');
      expect(content).toContain('default: true');
      expect(content).toContain('# Claude Provider (uncomment to enable)');
    });

    it('should generate config with Claude provider', () => {
      const options: InitOptions = {
        projectName: 'claude-project',
        agentName: 'claude-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          claude: {
            apiKey: 'CLAUDE_API_KEY',
            modelName: 'CLAUDE_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('claude:');
      expect(content).toContain('API_KEY: "CLAUDE_API_KEY"');
      expect(content).toContain('MODEL_NAME: "CLAUDE_MODEL_NAME"');
      expect(content).toContain('default: true');
      expect(content).toContain('# OpenAI Provider (uncomment to enable)');
    });

    it('should generate config with Ollama provider', () => {
      const options: InitOptions = {
        projectName: 'ollama-project',
        agentName: 'ollama-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          ollama: {
            modelName: 'OLLAMA_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('ollama:');
      expect(content).toContain('MODEL_NAME: "OLLAMA_MODEL_NAME"');
      expect(content).not.toContain('API_KEY:');
      expect(content).toContain('default: true');
    });

    it('should generate config with multiple providers', () => {
      const options: InitOptions = {
        projectName: 'multi-provider-project',
        agentName: 'multi-provider-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
          claude: {
            apiKey: 'CLAUDE_API_KEY',
            modelName: 'CLAUDE_MODEL_NAME',
            default: false,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('openai:');
      expect(content).toContain('claude:');
      expect(content).toContain('default: true'); // OpenAI
      expect(content).toContain('default: false'); // Claude
    });

    it('should handle provider without default flag', () => {
      const options: InitOptions = {
        projectName: 'no-default-project',
        agentName: 'no-default-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: false,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('default: false');
    });
  });

  describe('tool validation configuration', () => {
    it('should include check section in generated config', () => {
      const options: InitOptions = {
        projectName: 'check-project',
        agentName: 'check-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('# Tool Validation Configuration (v1.3.0)');
      expect(content).toContain('check:');
      expect(content).toContain('timeout_ms: 30000');
    });
  });

  describe('edge cases', () => {
    it('should handle empty project name', () => {
      const options: InitOptions = {
        projectName: '',
        agentName: 'test-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('project_name: ""');
    });

    it('should handle special characters in values', () => {
      const options: InitOptions = {
        projectName: 'test-project',
        agentName: 'test-agent',
        transport: 'stdio',
        script: 'python "server with spaces.py"',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      const configPath = generateConfigFile(options, tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');

      // The script value should be in the config, properly quoted
      expect(content).toContain('script:');
      expect(content).toContain('server with spaces.py');
    });
  });

  describe('isProjectInitialized', () => {
    it('should return false when config file does not exist', () => {
      expect(isProjectInitialized(tempDir)).toBe(false);
    });

    it('should return true when config file exists', () => {
      const options: InitOptions = {
        projectName: 'test-project',
        agentName: 'test-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      generateConfigFile(options, tempDir);
      expect(isProjectInitialized(tempDir)).toBe(true);
    });
  });

  describe('template file handling', () => {
    it('should successfully read template file from dist/config', () => {
      // This test verifies that the template file is accessible
      // The template should be copied to dist/config/ during build
      const options: InitOptions = {
        projectName: 'template-test-project',
        agentName: 'template-test-agent',
        transport: 'stdio',
        script: 'python server.py',
        llmProviders: {
          openai: {
            apiKey: 'OPENAI_API_KEY',
            modelName: 'OPENAI_MODEL_NAME',
            default: true,
          },
        },
      };

      // Should not throw - template should be found
      const configPath = generateConfigFile(options, tempDir);
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      // Verify template was used (should contain template comments)
      expect(content).toContain('# Syrin Configuration File');
      expect(content).toContain('# Tool Validation Configuration (v1.3.0)');
    });
  });
});
