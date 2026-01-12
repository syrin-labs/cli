/**
 * W108: Hidden Side Effects
 *
 * Condition:
 * - Tool name/description suggests mutation
 * - But schema does not reflect it
 *
 * Why:
 * - Execution surprises
 * - Hard to reason
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Mutation verbs used to detect side effects.
 */
const mutationVerbs = [
  'create',
  'delete',
  'remove',
  'update',
  'modify',
  'change',
  'set',
  'save',
  'write',
  'add',
  'insert',
  'destroy',
  'drop',
  'clear',
  'reset',
];

/**
 * Compiled regex for mutation verb detection (compiled once at module load).
 */
const MUTATION_REGEX = new RegExp(
  mutationVerbs.map(verb => `\\b${verb}\\b`).join('|'),
  'i'
);

/**
 * Check if a tool name/description suggests mutation.
 */
function suggestsMutation(toolName: string, description: string): boolean {
  const combined = `${toolName} ${description}`.toLowerCase();
  return MUTATION_REGEX.test(combined);
}

/**
 * Check if schema reflects mutation (has outputs that suggest state change).
 */
function schemaReflectsMutation(tool: {
  outputs: Array<{ name: string; description?: string }>;
}): boolean {
  // If no outputs, treat as void mutation (e.g., DELETE operations, ack-only operations).
  // This intentionally returns true to avoid false positives for tools that perform
  // side effects without returning data (such operations may mutate state but only
  // return success/acknowledgment implicitly).
  if (tool.outputs.length === 0) {
    return true;
  }

  // Check if outputs suggest mutation confirmation
  const mutationOutputs = [
    'success',
    'id',
    'result',
    'status',
    'created',
    'updated',
    'deleted',
  ];

  for (const output of tool.outputs) {
    const name = output.name.toLowerCase();
    const desc = (output.description || '').toLowerCase();

    if (mutationOutputs.some(mo => name.includes(mo) || desc.includes(mo))) {
      return true;
    }
  }

  return false;
}

class W108HiddenSideEffectsRule extends BaseRule {
  readonly id = 'W108';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Hidden Side Effects';
  readonly description =
    'Tool appears to have side effects not reflected in schema. Execution surprises.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';
      const suggestsMut = suggestsMutation(tool.name, description);
      const reflectsMut = schemaReflectsMutation(tool);

      // If it suggests mutation but schema doesn't reflect it
      if (suggestsMut && !reflectsMut) {
        diagnostics.push(
          this.createDiagnostic(
            `Tool "${tool.name}" appears to have side effects not reflected in schema.`,
            tool.name,
            undefined,
            `Update the output schema of "${tool.name}" to reflect state changes (e.g., add success status, created ID, etc.).`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W108HiddenSideEffects = new W108HiddenSideEffectsRule();
