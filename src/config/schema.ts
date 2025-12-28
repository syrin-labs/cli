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
  makeAPIKey,
  makeModelName,
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
  })
  .refine(
    data => {
      // For cloud providers (have API_KEY), both API_KEY and MODEL_NAME are required
      if (data.API_KEY) {
        if (!data.MODEL_NAME) {
          return false;
        }
        return true;
      }
      // For Ollama (no API_KEY), MODEL_NAME is required
      if (!data.API_KEY && !data.MODEL_NAME) {
        return false;
      }
      return true;
    },
    {
      message:
        'For cloud providers (OpenAI, Claude), API_KEY and MODEL_NAME are required. For Ollama, MODEL_NAME is required.',
    }
  );

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
    script: z.string().optional(),
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
      // If transport is stdio, script must be provided
      if (data.transport === 'stdio') {
        if (!data.script) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'script is required when transport is "stdio"',
      path: ['script'],
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
      script: parsed.script ? makeScriptCommand(parsed.script) : undefined,
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
