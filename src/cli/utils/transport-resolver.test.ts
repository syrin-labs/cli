/**
 * Tests for transport configuration resolution.
 * Covers zero-config path (no syrin.yaml when --url/--script provided) and defaults.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveTransportConfig } from './transport-resolver';
import { ConfigurationError } from '@/utils/errors';
import { TransportTypes } from '@/constants';
import type { SyrinConfig } from '@/config/types';
import { loadConfig, loadConfigWithGlobal } from '@/config/loader';

/** Stable test-only URL (no real external dependency). */
const TEST_MCP_URL = 'http://test-mcp.example/mcp';

const mockConfig: SyrinConfig = {
  project_name: 'TestProject' as SyrinConfig['project_name'],
  agent_name: 'TestAgent' as SyrinConfig['agent_name'],
  transport: TransportTypes.HTTP,
  url: 'http://localhost:8000/mcp' as SyrinConfig['url'],
  llm: {},
};

vi.mock('@/config/loader', () => ({
  loadConfig: vi.fn(),
  loadConfigWithGlobal: vi.fn(),
}));

describe('resolveTransportConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('zero-config (no syrin.yaml when --url or --script provided)', () => {
    it('should use minimal config when --url provided and no local/global config', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      const result = resolveTransportConfig({
        url: TEST_MCP_URL,
      });

      expect(result.transport).toBe(TransportTypes.HTTP);
      expect(result.url).toBe(TEST_MCP_URL);
      expect(result.script).toBeUndefined();
      expect(result.urlSource).toBe('cli');
      expect(result.scriptSource).toBeUndefined();
      expect(result.config.transport).toBe(TransportTypes.HTTP);
      expect(result.config.url).toBeDefined();
      expect(result.config.project_name).toBeDefined();
      expect(result.config.llm).toEqual({});
    });

    it('should use minimal config when --url provided without --transport (infer http)', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      const result = resolveTransportConfig({
        url: TEST_MCP_URL,
      });

      expect(result.transport).toBe(TransportTypes.HTTP);
      expect(result.url).toBe(TEST_MCP_URL);
    });

    it('should use minimal config when --script provided and no config', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      const result = resolveTransportConfig({
        script: 'python server.py',
      });

      expect(result.transport).toBe(TransportTypes.STDIO);
      expect(result.script).toBe('python server.py');
      expect(result.url).toBeUndefined();
      expect(result.scriptSource).toBe('cli');
      expect(result.config.transport).toBe(TransportTypes.STDIO);
      expect(result.config.script).toBeDefined();
    });

    it('should rethrow when loadConfigWithGlobal throws non-config-not-found error', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError('Configuration file is empty or invalid.');
      });

      expect(() =>
        resolveTransportConfig({ url: TEST_MCP_URL })
      ).toThrow(ConfigurationError);
      expect(() =>
        resolveTransportConfig({ url: TEST_MCP_URL })
      ).toThrow('Configuration file is empty or invalid');
    });

    it('should rethrow when loadConfigWithGlobal throws non-ConfigurationError', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      expect(() =>
        resolveTransportConfig({ url: TEST_MCP_URL })
      ).toThrow('Unexpected error');
    });
  });

  describe('with config (local or global)', () => {
    it('should use config when loadConfigWithGlobal returns local config', () => {
      vi.mocked(loadConfigWithGlobal).mockReturnValue({
        config: mockConfig,
        source: 'local',
      });

      const result = resolveTransportConfig({
        url: 'http://cli-override/mcp',
      });

      expect(loadConfigWithGlobal).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transport: TransportTypes.HTTP,
          url: 'http://cli-override/mcp',
          script: undefined,
        })
      );
      expect(result.transport).toBe(TransportTypes.HTTP);
      expect(result.url).toBe(mockConfig.url);
      expect(result.config).toBe(mockConfig);
    });

    it('should use config when loadConfigWithGlobal returns global config', () => {
      vi.mocked(loadConfigWithGlobal).mockReturnValue({
        config: mockConfig,
        source: 'global',
      });

      const result = resolveTransportConfig({
        url: 'http://cli-url/mcp',
        transport: TransportTypes.HTTP,
      });

      expect(result.config).toBe(mockConfig);
      expect(result.url).toBe(mockConfig.url);
    });
  });

  describe('default transport when --url provided', () => {
    it('should infer http transport when only --url provided (no --transport)', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      const result = resolveTransportConfig({
        url: TEST_MCP_URL,
      });

      expect(result.transport).toBe(TransportTypes.HTTP);
      expect(result.url).toBe(TEST_MCP_URL);
    });
  });

  describe('no --url/--script (config required)', () => {
    it('should use loadConfig when neither url nor script provided', () => {
      vi.mocked(loadConfig).mockReturnValue(mockConfig);

      const result = resolveTransportConfig({});

      expect(loadConfig).toHaveBeenCalled();
      expect(loadConfigWithGlobal).not.toHaveBeenCalled();
      expect(result.transport).toBe(mockConfig.transport);
      expect(result.url).toBe(mockConfig.url);
      expect(result.config).toBe(mockConfig);
    });

    it('should throw when no config and neither url nor script provided', () => {
      vi.mocked(loadConfig).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      expect(() => resolveTransportConfig({})).toThrow(ConfigurationError);
      expect(() => resolveTransportConfig({})).toThrow(
        'Configuration file not found'
      );
    });
  });

  describe('validation', () => {
    it('should throw when transport http but no url in config and no url in options', () => {
      vi.mocked(loadConfig).mockReturnValue({
        ...mockConfig,
        url: undefined,
      });

      expect(() => resolveTransportConfig({})).toThrow();
    });
  });

  describe('env and authHeaders', () => {
    it('should pass through env and authHeaders in result', () => {
      vi.mocked(loadConfigWithGlobal).mockImplementation(() => {
        throw new ConfigurationError(
          'Configuration file not found. Run `syrin init` to initialize the project.'
        );
      });

      const result = resolveTransportConfig({
        url: TEST_MCP_URL,
        env: { FOO: 'bar' },
        authHeaders: { Authorization: 'Bearer token' },
      });

      expect(result.env).toEqual({ FOO: 'bar' });
      expect(result.authHeaders).toEqual({ Authorization: 'Bearer token' });
    });
  });
});
