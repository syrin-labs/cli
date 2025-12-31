/**
 * Transport configuration resolution utilities.
 * Provides functions to resolve transport, URL, and script options from config and command options.
 */

import { loadConfig } from '@/config/loader';
import { ConfigurationError } from '@/utils/errors';
import type { TransportType, SyrinConfig } from '@/config/types';
import { Messages, TransportTypes } from '@/constants';

export interface TransportOptions {
  transport?: TransportType;
  url?: string;
  script?: string;
  projectRoot?: string;
}

export interface ResolvedTransportConfig {
  transport: TransportType;
  url?: string;
  script?: string;
  config: SyrinConfig;
  urlSource?: 'config' | 'cli';
  scriptSource?: 'config' | 'cli';
}

/**
 * Resolve transport configuration from command options and config file.
 * This centralizes the logic for determining transport type, URL, and script.
 *
 * @param options - Command options containing transport, url, script, and projectRoot
 * @returns Resolved transport configuration
 * @throws ConfigurationError if required parameters are missing
 */
export function resolveTransportConfig(
  options: TransportOptions
): ResolvedTransportConfig {
  const { transport, url, script, projectRoot } = options;

  // Load config to get default values
  const config = loadConfig(projectRoot);

  // Determine transport type
  const transportType: TransportType = transport || config.transport;
  let mcpUrl: string | undefined;
  let mcpScript: string | undefined;
  let urlSource: 'config' | 'cli' | undefined;
  let scriptSource: 'config' | 'cli' | undefined;

  if (transportType === TransportTypes.HTTP) {
    // Use provided URL or fall back to config
    if (url) {
      mcpUrl = url;
      urlSource = 'cli';
    } else {
      mcpUrl = config.mcp_url;
      if (mcpUrl) {
        urlSource = 'config';
      }
    }
  } else {
    // Use provided script or fall back to config.script
    if (script) {
      mcpScript = script;
      scriptSource = 'cli';
    } else {
      mcpScript = config.script ? String(config.script) : undefined;
      if (mcpScript) {
        scriptSource = 'config';
      }
    }
  }

  // Validate required parameters
  if (transportType === TransportTypes.HTTP && !mcpUrl) {
    throw new ConfigurationError(Messages.TRANSPORT_URL_REQUIRED);
  }

  if (transportType === TransportTypes.STDIO && !mcpScript) {
    throw new ConfigurationError(Messages.TRANSPORT_SCRIPT_REQUIRED);
  }

  return {
    transport: transportType,
    url: mcpUrl,
    script: mcpScript,
    config,
    urlSource,
    scriptSource,
  };
}
