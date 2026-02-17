/**
 * W116: Schema-Description Drift
 *
 * Condition:
 * - Tool description mentions parameters that don't exist in the schema
 * - Or schema has parameters that aren't mentioned in the description
 *
 * Why:
 * - Mismatches between description and schema cause confusion
 * - LLMs rely on accurate descriptions to understand tool usage
 */

import { BaseRule } from '@/runtime/analysis/rules/base';
import type { AnalysisContext, Diagnostic } from '@/runtime/analysis/types';

/**
 * Check if a parameter name appears in description (basic token matching).
 */
function isParamMentioned(description: string, paramName: string): boolean {
  const descLower = description.toLowerCase();
  const paramLower = paramName.toLowerCase();

  if (descLower.includes(paramLower)) return true;

  const paramWords = paramLower.split(/[\s_]+/).filter(w => w.length > 2);
  const descWords = descLower.split(/[\s_]+/);

  return paramWords.some(word => descWords.includes(word));
}

function checkForDrift(
  toolName: string,
  description: string,
  fields: { name: string; description?: string }[]
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!description || fields.length === 0) {
    return diagnostics;
  }

  const unmentionedFields: string[] = [];

  for (const field of fields) {
    const isMentioned = isParamMentioned(description, field.name);

    if (!isMentioned && field.name.length > 3) {
      unmentionedFields.push(field.name);
    }
  }

  if (
    unmentionedFields.length > 0 &&
    unmentionedFields.length >= fields.length * 0.5
  ) {
    diagnostics.push(
      new (class {
        readonly code = 'W116';
        readonly severity = 'warning' as const;
        readonly ruleName = 'Schema-Description Drift';
        readonly message = `Tool "${toolName}" has ${unmentionedFields.length} parameters not mentioned in description: ${unmentionedFields.slice(0, 5).join(', ')}${unmentionedFields.length > 5 ? '...' : ''}`;
        readonly tool = toolName;
        readonly suggestion = `Add descriptions for these parameters or mention them in the tool description.`;
      })()
    );
  }

  return diagnostics;
}

class W116SchemaDescriptionDriftRule extends BaseRule {
  readonly id = 'W116';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Schema-Description Drift';
  readonly description =
    'Tool description should match its schema. Mismatches confuse LLMs.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const toolDiagnostics = checkForDrift(tool.name, tool.description, [
        ...tool.inputs,
        ...tool.outputs,
      ]);
      diagnostics.push(...toolDiagnostics);
    }

    return diagnostics;
  }
}

export const W116SchemaDescriptionDrift = new W116SchemaDescriptionDriftRule();
