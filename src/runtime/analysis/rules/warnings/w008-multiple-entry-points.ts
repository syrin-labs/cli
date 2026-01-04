/**
 * W008: Multiple Entry Points for Same Concept
 *
 * Condition:
 * - Multiple tools ask user for same conceptual data
 *   (e.g. location, user_id)
 *
 * Why:
 * - Conflicting sources of truth
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';
import { escapeRegex } from '../../utils';

/**
 * Extract the concept from an input field name.
 */
function extractConcept(fieldName: string): string | null {
  // Split field name into tokens (on non-word characters and camelCase boundaries)
  // Preserve case for camelCase detection, then lowercase tokens individually
  const tokens = fieldName
    .split(/[^\w]+|(?<=[a-z])(?=[A-Z])/)
    .filter(t => t.length > 0)
    .map(t => t.toLowerCase());

  const name = fieldName.toLowerCase();

  // Common concepts
  const concepts: Array<[string[], string]> = [
    [['location', 'loc', 'place', 'address', 'city', 'country'], 'location'],
    [['user', 'user_id', 'userid', 'username', 'person'], 'user'],
    [['email', 'e-mail', 'mail'], 'email'],
    [['phone', 'telephone', 'mobile'], 'phone'],
    [['name', 'fullname', 'full_name'], 'name'],
    [['id', 'identifier'], 'id'],
  ];

  for (const [keywords, concept] of concepts) {
    for (const keyword of keywords) {
      // Check for exact token match or word-boundary match
      // Escape keyword to prevent regex injection
      const escapedKeyword = escapeRegex(keyword);
      const keywordRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
      if (tokens.includes(keyword) || keywordRegex.test(name)) {
        return concept;
      }
    }
  }

  return null;
}

class W008MultipleEntryPointsRule extends BaseRule {
  readonly id = 'W008';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Multiple Entry Points for Same Concept';
  readonly description =
    'Multiple tools capture the same concept. Conflicting sources of truth.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Map concept to tools that have it
    const conceptToTools = new Map<
      string,
      Array<{ tool: string; field: string }>
    >();

    for (const tool of ctx.tools) {
      for (const input of tool.inputs) {
        // Only check user-facing inputs
        if (!input.required) {
          continue;
        }

        const concept = extractConcept(input.name);
        if (!concept) {
          continue;
        }

        if (!conceptToTools.has(concept)) {
          conceptToTools.set(concept, []);
        }

        conceptToTools.get(concept)!.push({
          tool: tool.name,
          field: input.name,
        });
      }
    }

    // Check for concepts that appear in multiple tools
    for (const [concept, tools] of conceptToTools.entries()) {
      if (tools.length > 1) {
        const toolNames = tools.map(t => `"${t.tool}"`).join(', ');
        // Group by tool name in case same tool appears multiple times
        const toolFieldsMap = new Map<string, string[]>();
        for (const toolEntry of tools) {
          if (!toolFieldsMap.has(toolEntry.tool)) {
            toolFieldsMap.set(toolEntry.tool, []);
          }
          toolFieldsMap.get(toolEntry.tool)!.push(toolEntry.field);
        }
        const context: Record<string, unknown> = {};
        for (const [tool, fields] of toolFieldsMap.entries()) {
          context[tool] = fields.join(', ');
        }
        diagnostics.push(
          this.createDiagnostic(
            `Multiple tools capture the same concept: "${concept}" (${toolNames}).`,
            undefined,
            undefined,
            `Consolidate "${concept}" collection into a single tool to avoid conflicting sources of truth.`,
            context
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W008MultipleEntryPoints = new W008MultipleEntryPointsRule();
