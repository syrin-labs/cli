/**
 * Transport configuration resolution utilities.
 * Provides functions to resolve transport, URL, and script options from config and command options.
 */

import { loadConfig, loadConfigWithGlobal } from '@/config/loader';
import { ConfigurationError } from '@/utils/errors';
import type { TransportType, SyrinConfig } from '@/config/types';
import { getDefaultAgentName } from '@/config/types';
import {
  makeProjectName,
  makeAgentName,
  makeMCPURL,
  makeScriptCommand,
  makeSyrinVersion,
} from '@/types/factories';
import { Messages, TransportTypes } from '@/constants';

export interface TransportOptions {
  transport?: TransportType;
  url?: string;
  script?: string;
  projectRoot?: string;
  env?: Record<string, string>;
  authHeaders?: Record<string, string>;
}

export interface ResolvedTransportConfig {
  transport: TransportType;
  url?: string;
  script?: string;
  config: SyrinConfig;
  urlSource?: 'config' | 'cli';
  scriptSource?: 'config' | 'cli';
  env?: Record<string, string>;
  authHeaders?: Record<string, string>;
}

/**
 * Resolve transport configuration from command options and config file.
 * This centralizes the logic for determining transport type, URL, and script.
 *
 * @param options - Command options containing transport, url, script, and projectRoot
 * @returns Resolved transport configuration
 * @throws ConfigurationError if required parameters are missing
 */
/**
 * Build a minimal SyrinConfig when no config file exists but CLI provided --url or --script.
 */
function buildMinimalConfig(
  transportType: TransportType,
  mcpUrl: string | undefined,
  mcpScript: string | undefined
): SyrinConfig {
  return {
    version: makeSyrinVersion('1.0.0'),
    project_name: makeProjectName('CLI'),
    agent_name: makeAgentName(getDefaultAgentName()),
    transport: transportType,
    ...(mcpUrl ? { url: makeMCPURL(mcpUrl) } : {}),
    ...(mcpScript ? { script: makeScriptCommand(mcpScript) } : {}),
    llm: {},
  };
}

export function resolveTransportConfig(
  options: TransportOptions
): ResolvedTransportConfig {
  const { transport, url, script, projectRoot } = options;
  const projectRootResolved = projectRoot || process.cwd();

  // When --url or --script is provided: try local then global config, then minimal (no init required)
  const hasCliConnection = Boolean(url || script);
  const flags = {
    transport:
      transport ||
      (url ? TransportTypes.HTTP : script ? TransportTypes.STDIO : undefined),
    url,
    script,
  };

  let config: SyrinConfig | null = null;
  let transportType: TransportType;
  let mcpUrl: string | undefined;
  let mcpScript: string | undefined;
  let urlSource: 'config' | 'cli' | undefined;
  let scriptSource: 'config' | 'cli' | undefined;

  if (hasCliConnection) {
    try {
      const result = loadConfigWithGlobal(projectRootResolved, flags);
      config = result.config;
      transportType = config.transport;
      mcpUrl = config.url ? String(config.url) : undefined;
      mcpScript = config.script ? String(config.script) : undefined;
      urlSource = url ? 'cli' : config.url ? 'config' : undefined;
      scriptSource = script ? 'cli' : config.script ? 'config' : undefined;
    } catch (err) {
      // No local and no global config: use minimal config (zero-config path)
      const isConfigNotFound =
        err instanceof ConfigurationError &&
        err.message.includes('Configuration file not found');
      if (!isConfigNotFound) {
        throw err;
      }
      transportType = script
        ? TransportTypes.STDIO
        : url
          ? TransportTypes.HTTP
          : TransportTypes.HTTP;
      mcpUrl = url;
      mcpScript = script;
      urlSource = url ? 'cli' : undefined;
      scriptSource = script ? 'cli' : undefined;
    }
  } else {
    // No --url/--script: require local config (global-only needs --transport and --url/--script)
    config = loadConfig(projectRootResolved);
    transportType = config.transport;
    mcpUrl = config.url ? String(config.url) : undefined;
    mcpScript = config.script ? String(config.script) : undefined;
    urlSource = config.url ? 'config' : undefined;
    scriptSource = config.script ? 'config' : undefined;
  }

  // Validate required parameters
  if (transportType === TransportTypes.HTTP && !mcpUrl) {
    throw new ConfigurationError(Messages.TRANSPORT_URL_REQUIRED);
  }

  if (transportType === TransportTypes.STDIO && !mcpScript) {
    throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED);
  }

  const resolvedConfig =
    config ?? buildMinimalConfig(transportType, mcpUrl, mcpScript);

  return {
    transport: transportType,
    url: mcpUrl,
    script: mcpScript,
    config: resolvedConfig,
    urlSource,
    scriptSource,
    env: options.env,
    authHeaders: options.authHeaders,
  };
}
