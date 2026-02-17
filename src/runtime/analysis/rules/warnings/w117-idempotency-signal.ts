/**
 * W117: Idempotency Signal Missing
 *
 * Condition:
 * - Mutation tool (create, update, delete, modify) lacks idempotency signal
 *
 * Why:
 * - Non-idempotent operations can cause unintended side effects
 * - LLMs should know if calling a tool multiple times is safe
 * - Important for retry logic and error handling
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';
import { isConceptMatch } from '@/runtime/analysis/semantic-embedding';

class W117IdempotencySignalRule extends BaseRule {
  readonly id = 'W117';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Idempotency Signal Missing';
  readonly description =
    'Mutation tools should indicate if they are idempotent for safe retry logic.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      const isMutation = isConceptMatch(
        tool.descriptionEmbedding,
        'MUTATION',
        0.45
      );

      if (isMutation) {
        const hasIdempotencySignal = isConceptMatch(
          tool.descriptionEmbedding,
          'IDEMPOTENT',
          0.4
        );

        if (!hasIdempotencySignal) {
          diagnostics.push(
            this.createDiagnostic(
              `Mutation tool "${tool.name}" lacks idempotency signal. Consider adding "idempotent" or "safe to retry" to description.`,
              tool.name,
              undefined,
              `Add idempotency information: "This operation is idempotent" or "Can be safely retried with the same result."`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const W117IdempotencySignal = new W117IdempotencySignalRule();
