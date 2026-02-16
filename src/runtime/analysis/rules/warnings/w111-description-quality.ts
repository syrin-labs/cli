/**
 * W111: Tool Description Quality Check
 *
 * Condition:
 * - Description too short (<20 chars) or too long (>500 chars)
 *
 * Why:
 * - Too short: LLM cannot understand tool purpose
 * - Too long: Context bloat, hard to read
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 500;

class W111DescriptionQualityRule extends BaseRule {
  readonly id = 'W111';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Tool Description Quality';
  readonly description =
    'Tool description should be between 20-500 characters for optimal LLM understanding.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const description = tool.description || '';
      const length = description.length;

      if (length > 0 && length < MIN_DESCRIPTION_LENGTH) {
        diagnostics.push(
          this.createDiagnostic(
            `Description of "${tool.name}" is too short (${length} chars). Add more context for LLM.`,
            tool.name,
            undefined,
            `Expand the description to at least ${MIN_DESCRIPTION_LENGTH} characters.`
          )
        );
      } else if (length > MAX_DESCRIPTION_LENGTH) {
        diagnostics.push(
          this.createDiagnostic(
            `Description of "${tool.name}" is too long (${length} chars). Consider shortening.`,
            tool.name,
            undefined,
            `Reduce description to under ${MAX_DESCRIPTION_LENGTH} characters for better readability.`
          )
        );
      }
    }

    return diagnostics;
  }
}

export const W111DescriptionQuality = new W111DescriptionQualityRule();
