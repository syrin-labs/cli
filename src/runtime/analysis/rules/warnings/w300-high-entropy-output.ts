/**
 * W300: High Entropy Output
 *
 * Condition: Tool output has high entropy (random, unpredictable structure)
 *
 * Why this is a warning:
 * - High entropy makes it hard for LLM to reason about output
 * - Indicates potential design issues
 * - May indicate non-determinism
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

/**
 * Context for high entropy detection.
 */
export interface HighEntropyContext {
  /** Tool name */
  toolName: string;
  /** Entropy score (0-1, higher = more entropy) */
  entropyScore: number;
  /** Reason for high entropy */
  reason?: string;
  /** Optional custom entropy threshold (defaults to 0.7 if not provided) */
  entropyThreshold?: number;
}

class W300HighEntropyOutputRule extends BaseRule {
  readonly id = 'W300';
  readonly severity = 'warning' as const;
  readonly ruleName = 'High Entropy Output';
  readonly description =
    'Tool output has high entropy, making it difficult for LLM to reason about.';

  check(_ctx: AnalysisContext): Diagnostic[] {
    // This rule requires behavioral context
    return [];
  }

  /**
   * Check with behavioral context (called from test orchestrator).
   */
  checkWithBehavioralContext(behavioralCtx: HighEntropyContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Validate and clamp entropyScore to [0, 1]
    const entropyScore = Math.max(0, Math.min(1, behavioralCtx.entropyScore));
    if (entropyScore !== behavioralCtx.entropyScore) {
      // Out of range - could log warning or error in production
      // For now, we silently clamp to valid range
    }

    // Validate and clamp entropyThreshold to [0, 1], default to 0.7
    let threshold = behavioralCtx.entropyThreshold ?? 0.7;
    if (threshold < 0 || threshold > 1 || !Number.isFinite(threshold)) {
      // Invalid threshold - use default
      threshold = 0.7;
    }
    threshold = Math.max(0, Math.min(1, threshold));

    // Threshold: entropy above configured value is considered high
    if (entropyScore > threshold) {
      diagnostics.push(
        this.createDiagnostic(
          `Tool "${behavioralCtx.toolName}" produces high entropy output (score: ${entropyScore.toFixed(2)}, threshold: ${threshold.toFixed(2)}).${behavioralCtx.reason ? ` ${behavioralCtx.reason}` : ''}`,
          behavioralCtx.toolName,
          undefined,
          'Consider normalizing output structure, reducing randomness, or providing more predictable output format.'
        )
      );
    }

    return diagnostics;
  }
}

export const W300HighEntropyOutput = new W300HighEntropyOutputRule();
