/**
 * Rule engine base types and interfaces.
 */

import type { AnalysisContext, Diagnostic } from '../types';

/**
 * Base interface for all analysis rules.
 */
export interface Rule {
  /** Rule ID (e.g., "E001", "W001") */
  id: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Human-readable rule name */
  ruleName: string;
  /** Rule description */
  description: string;
  /**
   * Check function that returns diagnostics for violations.
   * @param ctx - Analysis context
   * @returns Array of diagnostics (empty if no violations)
   */
  check(ctx: AnalysisContext): Diagnostic[];
}

/**
 * Base rule implementation helper.
 */
export abstract class BaseRule implements Rule {
  abstract readonly id: string;
  abstract readonly severity: 'error' | 'warning';
  abstract readonly ruleName: string;
  abstract readonly description: string;

  abstract check(ctx: AnalysisContext): Diagnostic[];

  /**
   * Create a diagnostic.
   */
  protected createDiagnostic(
    message: string,
    tool?: string,
    field?: string,
    suggestion?: string,
    context?: Record<string, unknown>,
    severity?: 'error' | 'warning'
  ): Diagnostic {
    return {
      code: this.id,
      severity: severity ?? this.severity,
      message,
      tool,
      field,
      suggestion,
      context,
    };
  }
}
