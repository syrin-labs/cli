/**
 * Strict mode utilities.
 * Converts warnings to errors when strict mode is enabled.
 */

import type { Diagnostic } from './types';

/**
 * Apply strict mode to diagnostics.
 * In strict mode, warnings are treated as errors.
 * @param diagnostics - Array of diagnostics
 * @param strictMode - Whether strict mode is enabled
 * @returns Diagnostics with warnings converted to errors (if strict mode)
 */
export function applyStrictMode(
  diagnostics: Diagnostic[],
  strictMode: boolean
): Diagnostic[] {
  if (!strictMode) {
    return diagnostics;
  }

  return diagnostics.map(diagnostic => {
    if (diagnostic.severity === 'warning') {
      return {
        ...diagnostic,
        severity: 'error' as const,
      };
    }
    return diagnostic;
  });
}

/**
 * Compute verdict from diagnostics (with strict mode support).
 * @param diagnostics - Array of diagnostics
 * @param strictMode - Whether strict mode is enabled
 * @returns Verdict: 'pass', 'fail', or 'pass-with-warnings'
 */
export function computeVerdict(
  diagnostics: Diagnostic[],
  strictMode: boolean = false
): 'pass' | 'fail' | 'pass-with-warnings' {
  const processedDiagnostics = applyStrictMode(diagnostics, strictMode);
  const errors = processedDiagnostics.filter(d => d.severity === 'error');
  const warnings = processedDiagnostics.filter(d => d.severity === 'warning');

  if (errors.length > 0) {
    return 'fail';
  }

  if (warnings.length > 0) {
    return 'pass-with-warnings';
  }

  return 'pass';
}
