/**
 * W114: Input Schema Depth Limit
 *
 * Condition:
 * - Input schema depth exceeds 3 levels
 *
 * Why:
 * - LLMs struggle with deeply nested schemas
 * - Causes confusion in tool selection and parameter construction
 * - Should flatten or decompose complex schemas
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

const MAX_SCHEMA_DEPTH = 3;

function calculateSchemaDepth(schema: unknown, depth = 1): number {
  if (!schema || typeof schema !== 'object') {
    return depth;
  }

  const s = schema as Record<string, unknown>;

  if (!s.properties || typeof s.properties !== 'object') {
    return depth;
  }

  let maxDepth = depth;
  const props = s.properties as Record<string, unknown>;

  for (const prop of Object.values(props)) {
    if (prop && typeof prop === 'object') {
      const childDepth = calculateSchemaDepth(prop, depth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }

  return maxDepth;
}

class W114SchemaDepthRule extends BaseRule {
  readonly id = 'W114';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Input Schema Depth Limit';
  readonly description = `Input schema depth should not exceed ${MAX_SCHEMA_DEPTH} levels for optimal LLM understanding.`;

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const field of tool.inputs) {
        const depth = calculateSchemaDepth(
          (field as { properties?: unknown }).properties
        );

        if (depth > MAX_SCHEMA_DEPTH) {
          diagnostics.push(
            this.createDiagnostic(
              `Input parameter "${field.name}" in "${tool.name}" has schema depth of ${depth} (max: ${MAX_SCHEMA_DEPTH}).`,
              tool.name,
              field.name,
              `Flatten the schema or decompose into separate parameters for better LLM understanding.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const W114SchemaDepth = new W114SchemaDepthRule();
