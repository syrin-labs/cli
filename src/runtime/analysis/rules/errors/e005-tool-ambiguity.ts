/**
 * E005: Hard Tool Ambiguity
 *
 * Condition:
 * - Two or more tools:
 *   - Overlapping descriptions
 *   - Overlapping schemas
 *   - No clear differentiator
 *
 * Why:
 * - Tool selection becomes nondeterministic
 * - Agent behavior changes across runs/models
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Calculate similarity between two sets of tokens.
 */
function tokenSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0.0;
  }

  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Calculate schema overlap between two tools.
 */
function schemaOverlap(
  inputs1: readonly { name: string; type: string }[],
  inputs2: readonly { name: string; type: string }[]
): number {
  const names1 = new Set(inputs1.map(i => i.name.toLowerCase()));
  const names2 = new Set(inputs2.map(i => i.name.toLowerCase()));

  const nameOverlapSet = new Set([...names1].filter(n => names2.has(n)));
  const nameOverlap = nameOverlapSet.size;
  const totalNames = new Set([...names1, ...names2]).size;

  if (totalNames === 0) {
    return 0.0;
  }

  return nameOverlap / totalNames;
}

class E005ToolAmbiguityRule extends BaseRule {
  readonly id = 'E005';
  readonly severity = 'error' as const;
  readonly ruleName = 'Hard Tool Ambiguity';
  readonly description =
    'Multiple tools match the same intent. LLM tool selection is ambiguous.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const checked = new Set<string>();

    for (let i = 0; i < ctx.tools.length; i++) {
      const tool1 = ctx.tools[i];
      if (!tool1) continue;

      for (let j = i + 1; j < ctx.tools.length; j++) {
        const tool2 = ctx.tools[j];
        if (!tool2) continue;

        const pairKey = `${tool1.name},${tool2.name}`;
        if (checked.has(pairKey)) {
          continue;
        }
        checked.add(pairKey);

        // Calculate description similarity
        const descSimilarity = tokenSimilarity(
          tool1.descriptionTokens,
          tool2.descriptionTokens
        );

        // Calculate schema overlap
        const inputOverlap = schemaOverlap(tool1.inputs, tool2.inputs);
        const outputOverlap = schemaOverlap(tool1.outputs, tool2.outputs);
        const schemaOverlapScore = (inputOverlap + outputOverlap) / 2;

        // If both description and schema are very similar, it's ambiguous
        // Threshold: >0.7 description similarity AND >0.5 schema overlap
        if (descSimilarity > 0.7 && schemaOverlapScore > 0.5) {
          diagnostics.push(
            this.createDiagnostic(
              `Multiple tools match the same intent: "${tool1.name}", "${tool2.name}". LLM tool selection is ambiguous.`,
              undefined,
              undefined,
              `Differentiate "${tool1.name}" and "${tool2.name}" by making their descriptions and schemas more distinct.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E005ToolAmbiguity = new E005ToolAmbiguityRule();
