/**
 * Contract schema validation using Zod.
 * Provides runtime validation for tool contract YAML files.
 */

import { z } from 'zod';
import type { ToolContract } from './contract-types';

/**
 * Schema for contract guarantees.
 */
const ContractGuaranteesSchema = z.object({
  deterministic: z.boolean().optional(),
  side_effects: z.enum(['none', 'filesystem']).optional(),
  max_output_size: z
    .string()
    .regex(
      /^\d+[kmgt]?b$/i,
      'max_output_size must be in format: <number>[unit] (e.g., "100kb", "1mb", "2gb")'
    )
    .optional(),
  max_execution_time: z
    .string()
    .regex(
      /^\d+[smhd]$/i,
      'max_execution_time must be in format: <number><unit> (e.g., "30s", "5m", "2h")'
    )
    .optional(),
});

/**
 * Schema for error expectation details.
 */
const ErrorExpectationDetailsSchema = z
  .record(z.string(), z.unknown())
  .optional();

/**
 * Schema for error expectation.
 */
const ErrorExpectationSchema = z
  .object({
    code: z.string().optional(), // Made optional - match by type/details instead
    type: z
      .string()
      .optional()
      .refine(
        val =>
          !val ||
          [
            'input_validation',
            'output_validation',
            'execution_error',
            'output_explosion',
            'unbounded_execution',
            'side_effect',
          ].includes(val),
        {
          message:
            'Error type must be one of: input_validation, output_validation, execution_error, output_explosion, unbounded_execution, side_effect',
        }
      ),
    details: ErrorExpectationDetailsSchema,
  })
  .refine(data => data.code || data.type || data.details, {
    message:
      'Error expectation must specify at least one of: code, type, or details',
  });

/**
 * Schema for test expectation.
 */
const TestExpectationSchema = z
  .object({
    success: z.boolean().optional(),
    output_schema: z.string().optional(),
    error: ErrorExpectationSchema.optional(),
  })
  .refine(data => !(data.success === true && data.error), {
    message: 'Cannot specify both success=true and error expectation',
    path: ['success'],
  })
  .refine(data => !(data.success === false && !data.error), {
    message: 'If success=false, must specify error expectation',
    path: ['success'],
  });

/**
 * Schema for contract test cases.
 * Note: Inline import is intentional to avoid circular dependency with contract-types.
 */
import type { ContractTest } from './contract-types';

const ContractTestSchema: z.ZodType<ContractTest> = z.object({
  name: z.string().min(1, 'Test name is required'),
  input: z.record(z.string(), z.unknown()),
  expect: TestExpectationSchema.optional(),
  env: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for tool unit contract.
 */
export const ToolContractSchema = z
  .object({
    version: z.literal(1),
    tool: z.string().min(1, 'Tool name is required'),
    contract: z.object({
      input_schema: z.string().min(1, 'Input schema name is required'),
      output_schema: z.string().min(1, 'Output schema name is required'),
    }),
    guarantees: ContractGuaranteesSchema,
    tests: z.array(ContractTestSchema).optional(),
  })
  .strict();

/**
 * Validate a contract object against the schema.
 * @param data - Contract data to validate
 * @returns Validated contract
 * @throws {z.ZodError} If validation fails
 */
export function validateContract(data: unknown): ToolContract {
  return ToolContractSchema.parse(data);
}

/**
 * Type guard to check if an object is a valid contract.
 * @param data - Object to check
 * @returns true if object is a valid contract
 */
export function isContract(data: unknown): data is ToolContract {
  return ToolContractSchema.safeParse(data).success;
}
