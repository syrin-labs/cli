/**
 * Configuration schema validation using Zod.
 * Provides runtime validation for the Syrin configuration file.
 */

import { z } from 'zod';
import type { SyrinConfig, GlobalSyrinConfig } from '@/config/types';
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
 * Helper function to check if at least one LLM provider is set as default.
 * @param llm - Record of LLM provider configurations
 * @returns true if at least one provider has default === true
 */
function hasDefaultLLMProvider(llm: Record<string, unknown>): boolean {
  const providers = Object.values(llm);
  return providers.some(provider => {
    return (
      provider &&
      typeof provider === 'object' &&
      'default' in provider &&
      (provider as { default?: boolean }).default === true
    );
  });
}

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
 * Schema for check configuration (v1.3.0).
 */
const CheckConfigSchema = z
  .object({
    timeout_ms: z.number().int().positive().optional(),
    memory_limit_mb: z.number().int().positive().optional(),
    tools_dir: z.string().min(1).optional(),
    max_output_size_kb: z.number().int().positive().optional(),
    determinism_runs: z.number().int().positive().min(2).optional(),
    test_retries: z.boolean().optional(),
    max_retries: z.number().int().min(1).max(10).optional(),
    retry_delay_ms: z.number().int().nonnegative().optional(),
    strict_mode: z.boolean().optional(),
  })
  .optional();

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
    check: CheckConfigSchema,
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
  .refine(data => hasDefaultLLMProvider(data.llm), {
    message: 'At least one LLM provider must be set as default',
    path: ['llm'],
  });

/**
 * Type inference from schema.
 */
export type ConfigSchemaType = z.infer<typeof ConfigSchema>;

/**
 * Global configuration schema (LLM settings only).
 * No transport, mcp_url, or script fields.
 */
export const GlobalConfigSchema = z
  .object({
    version: z.string().min(1, 'Version is required'),
    project_name: z.literal('GlobalSyrin'),
    agent_name: z.string().min(1, 'Agent name is required'),
    llm: z
      .record(z.string(), LLMProviderSchema)
      .refine(obj => Object.keys(obj).length > 0, {
        message: 'At least one LLM provider is required',
      }),
  })
  .refine(data => hasDefaultLLMProvider(data.llm), {
    message: 'At least one LLM provider must be set as default',
    path: ['llm'],
  });

/**
 * Type inference from global schema.
 */
export type GlobalConfigSchemaType = z.infer<typeof GlobalConfigSchema>;

/**
 * Validate a configuration object against the schema.
 * @param config - Configuration object to validate
 * @returns Validated configuration with opaque types
 * @throws {ConfigurationError} If validation fails
 */
/**
 * Format Zod validation errors into user-friendly messages.
 */
function formatValidationError(error: z.ZodError): string {
  const issues = error.issues;
  if (issues.length === 0) {
    return 'Configuration validation failed';
  }

  const messages: string[] = [];
  for (const issue of issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'configuration';
    let message = `\n  • ${path}: ${issue.message}`;

    // Add helpful hints for common errors
    if (issue.code === 'invalid_type') {
      // Type guard for invalid_type issues
      const invalidTypeIssue = issue as z.ZodIssue & {
        expected: string;
        received: string;
      };
      if (invalidTypeIssue.received === 'undefined') {
        message += `\n    → Fix: Add "${path}" to your config.yaml file`;
      } else {
        message += `\n    → Expected: ${invalidTypeIssue.expected}, but received: ${invalidTypeIssue.received}`;
      }
    } else if (issue.code === 'too_small') {
      // Type guard for too_small issues
      const tooSmallIssue = issue as z.ZodIssue & {
        type?: string;
      };
      if (tooSmallIssue.type === 'string') {
        message += `\n    → Fix: "${path}" cannot be empty`;
      }
    }

    // Check for URL validation errors in the message
    if (
      issue.message.toLowerCase().includes('url') ||
      issue.message.toLowerCase().includes('invalid url')
    ) {
      message += `\n    → Fix: Provide a valid URL for "${path}"`;
    }

    messages.push(message);
  }

  return `Configuration validation failed:${messages.join('')}\n\n💡 Tip: Run \`syrin doctor\` after fixing your config.yaml to verify the setup.`;
}

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
      check: parsed.check,
    };

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigurationError(formatValidationError(error), {
        context: { errors: error.issues },
      });
    }
    throw error;
  }
}

/**
 * Validate a global configuration object against the schema.
 * @param config - Global configuration object to validate
 * @returns Validated global configuration with opaque types
 * @throws {ConfigurationError} If validation fails
 */
export function validateGlobalConfig(config: unknown): GlobalSyrinConfig {
  try {
    const parsed = GlobalConfigSchema.parse(config);

    // Transform to opaque types
    // Note: project_name must be literal 'GlobalSyrin' for global config
    const validated: GlobalSyrinConfig = {
      version: makeSyrinVersion(parsed.version),
      project_name: 'GlobalSyrin',
      agent_name: makeAgentName(parsed.agent_name),
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
      throw new ConfigurationError(formatValidationError(error), {
        context: { errors: error.issues },
      });
    }
    throw error;
  }
}
