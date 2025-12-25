/**
 * Configuration schema validation using Zod.
 * Provides runtime validation for the Syrin configuration file.
 */

import { z } from 'zod';
import type { SyrinConfig } from '@/config/types';
import { ConfigurationError } from '@/utils/errors';
import {
  makeProjectName,
  makeAgentName,
  makeMCPURL,
  makeCommand,
  makeAPIKey,
  makeModelName,
  makeProviderIdentifier,
  makeScriptCommand,
  makeSyrinVersion,
} from '@/types/factories';

/**
 * Schema for LLM provider configuration.
 */
const LLMProviderSchema = z
  .object({
    API_KEY: z.string().optional(),
    MODEL_NAME: z.string().optional(),
    default: z.boolean().optional(),
    provider: z.string().optional(),
    command: z.string().optional(),
  })
  .refine(
    data => {
      // For local providers (with provider field), API_KEY and MODEL_NAME are not required
      if (data.provider) {
        return true;
      }
      // For cloud providers, API_KEY and MODEL_NAME are required
      if (!data.API_KEY || !data.MODEL_NAME) {
        return false;
      }
      return true;
    },
    {
      message: 'API_KEY and MODEL_NAME are required for cloud providers',
    }
  )
  .refine(
    data => {
      // If provider is specified, command should also be specified (for local providers)
      if (data.provider && !data.command) {
        return false;
      }
      return true;
    },
    {
      message: 'Local providers must specify both provider and command',
    }
  );

/**
 * Schema for script configuration.
 */
const ScriptSchema = z.object({
  dev: z.string().min(1, 'Dev script is required'),
  start: z.string().min(1, 'Start script is required'),
});

/**
 * Main configuration schema.
 */
export const ConfigSchema = z
  .object({
    version: z.string().min(1, 'Version is required'),
    project_name: z.string().min(1, 'Project name is required'),
    agent_name: z.string().min(1, 'Agent name is required'),
    transport: z.enum(['stdio', 'http']),
    mcp_url: z.string().url().optional(),
    command: z.string().optional(),
    script: ScriptSchema,
    llm: z
      .record(z.string(), LLMProviderSchema)
      .refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one LLM provider is required',
      }),
  })
  .refine(
    data => {
      // If transport is http, mcp_url must be provided
      if (data.transport === 'http' && !data.mcp_url) {
        return false;
      }
      return true;
    },
    {
      message: 'mcp_url is required when transport is "http"',
      path: ['mcp_url'],
    }
  )
  .refine(
    data => {
      // If transport is stdio, command must be provided
      if (data.transport === 'stdio' && !data.command) {
        return false;
      }
      return true;
    },
    {
      message: 'command is required when transport is "stdio"',
      path: ['command'],
    }
  )
  .refine(
    data => {
      // At least one LLM provider should be set as default
      const providers = Object.values(data.llm);
      const hasDefault = providers.some(provider => {
        return (
          provider && typeof provider === 'object' && provider.default === true
        );
      });
      return hasDefault;
    },
    {
      message: 'At least one LLM provider must be set as default',
      path: ['llm'],
    }
  );

/**
 * Type inference from schema.
 */
export type ConfigSchemaType = z.infer<typeof ConfigSchema>;

/**
 * Validate a configuration object against the schema.
 * @param config - Configuration object to validate
 * @returns Validated configuration with opaque types
 * @throws {ConfigurationError} If validation fails
 */
export function validateConfig(config: unknown): SyrinConfig {
  try {
    const parsed = ConfigSchema.parse(config);

    // Transform to opaque types
    const validated: SyrinConfig = {
      version: makeSyrinVersion(parsed.version),
      project_name: makeProjectName(parsed.project_name),
      agent_name: makeAgentName(parsed.agent_name),
      transport: parsed.transport,
      mcp_url: parsed.mcp_url ? makeMCPURL(parsed.mcp_url) : undefined,
      command: parsed.command ? makeCommand(parsed.command) : undefined,
      script: {
        dev: makeScriptCommand(parsed.script.dev),
        start: makeScriptCommand(parsed.script.start),
      },
      llm: Object.fromEntries(
        Object.entries(parsed.llm).map(([key, provider]) => [
          key,
          {
            API_KEY: provider.API_KEY
              ? makeAPIKey(provider.API_KEY)
              : undefined,
            MODEL_NAME: provider.MODEL_NAME
              ? makeModelName(provider.MODEL_NAME)
              : undefined,
            default: provider.default,
            provider: provider.provider
              ? makeProviderIdentifier(provider.provider)
              : undefined,
            command: provider.command
              ? makeCommand(provider.command)
              : undefined,
          },
        ])
      ),
    };

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map(issue => {
          const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
          return `${path}: ${issue.message}`;
        })
        .join('\n');
      throw new ConfigurationError(
        `Configuration validation failed:\n${errorMessages}`,
        {
          context: { errors: error.issues },
        }
      );
    }
    throw error;
  }
}
