/**
 * Behavioral observer for tool execution.
 * Observes and detects unsafe tool behaviors.
 */

import type { IOMonitor, FSOperationRecord } from '@/runtime/sandbox';
import type { ToolExecutionResult } from '@/runtime/sandbox';
import { ToolExecutionErrorType } from '@/runtime/sandbox';
import type { ToolContract } from './contract-types';

/**
 * Side effect detection result.
 */
export interface SideEffectResult {
  /** Whether side effects violate the contract (detected when contract requires none) */
  detected: boolean;
  /** List of observed side effect operations */
  sideEffects: FSOperationRecord[];
  /** Whether any side effects were observed (regardless of contract) */
  observed: boolean;
}

/**
 * Output size validation result.
 */
export interface OutputSizeResult {
  /** Whether output size exceeds limit */
  exceedsLimit: boolean;
  /** Actual output size in bytes */
  actualSize: number;
  /** Maximum allowed size in bytes */
  maxSize: number;
  /** Size limit from contract (e.g., "50kb") */
  limitString: string;
}

/**
 * Parse size string (e.g., "50kb", "1mb") to bytes.
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)(kb|mb|gb|b)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = (match[2] || 'b').toLowerCase();

  switch (unit) {
    case 'kb':
      return value * 1024;
    case 'mb':
      return value * 1024 * 1024;
    case 'gb':
      return value * 1024 * 1024 * 1024;
    case 'b':
    default:
      return value;
  }
}

/**
 * Calculate size of a value in bytes (JSON stringified).
 */
function calculateSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    // If value can't be stringified, estimate
    return String(value).length;
  }
}

/**
 * Behavioral observer for tool execution.
 */
export class BehaviorObserver {
  /**
   * Detect side effects from I/O monitor.
   */
  detectSideEffects(
    ioMonitor: IOMonitor,
    contract: ToolContract
  ): SideEffectResult {
    const sideEffects = ioMonitor.getSideEffects();
    const observed = sideEffects.length > 0;

    // Check if side effects violate contract
    const guarantees = contract.guarantees;
    const requiresNoSideEffects = guarantees?.side_effects === 'none';
    const violatesContract = observed && requiresNoSideEffects;

    return {
      detected: violatesContract,
      sideEffects,
      observed,
    };
  }

  /**
   * Check output size against contract limits.
   */
  checkOutputSize(
    results: ToolExecutionResult[],
    contract: ToolContract,
    defaultMaxSizeKB: number = 50
  ): OutputSizeResult[] {
    const guarantees = contract.guarantees;
    const maxSizeStr = guarantees?.max_output_size;

    // Determine max size
    let maxSizeBytes: number;
    if (maxSizeStr) {
      maxSizeBytes = parseSize(maxSizeStr);
    } else {
      maxSizeBytes = defaultMaxSizeKB * 1024;
    }

    // Check each result
    return results.map(result => {
      if (!result.success) {
        // Failed executions don't have output, so they can't exceed size limit
        return {
          exceedsLimit: false,
          actualSize: 0,
          maxSize: maxSizeBytes,
          limitString: maxSizeStr || `${defaultMaxSizeKB}kb`,
        };
      }

      const actualSize = calculateSize(result.output);

      return {
        exceedsLimit: actualSize > maxSizeBytes,
        actualSize,
        maxSize: maxSizeBytes,
        limitString: maxSizeStr || `${defaultMaxSizeKB}kb`,
      };
    });
  }

  /**
   * Detect if tool execution timed out or failed.
   * E016 should only trigger for timeouts and connection errors, NOT execution errors (E019).
   */
  detectUnboundedExecution(results: ToolExecutionResult[]): {
    detected: boolean;
    timedOut: boolean;
    errors: Error[];
  } {
    const failedResults = results.filter(
      (r): r is Extract<ToolExecutionResult, { success: false }> => !r.success
    );
    const timedOut = failedResults.some(r => r.timedOut === true);

    // Filter out input validation errors (E018) and execution errors (E019)
    // E016 should only detect timeouts and connection errors (unbounded execution)
    const errors = failedResults
      .filter(r => {
        const errorType = r.error.errorType;
        // Exclude input validation errors (handled by E018)
        // Exclude execution errors (handled by E019)
        // Only include timeouts and connection errors for E016
        return (
          errorType !== ToolExecutionErrorType.INPUT_VALIDATION &&
          errorType !== ToolExecutionErrorType.EXECUTION_ERROR &&
          (r.timedOut === true ||
            errorType === ToolExecutionErrorType.CONNECTION_ERROR ||
            errorType === ToolExecutionErrorType.TIMEOUT)
        );
      })
      .map(r => r.error);

    return {
      detected: timedOut || errors.length > 0,
      timedOut,
      errors,
    };
  }

  /**
   * Detect execution errors (E019) - separate from unbounded execution (E016).
   */
  detectExecutionErrors(results: ToolExecutionResult[]): {
    detected: boolean;
    errors: Error[];
  } {
    const failedResults = results.filter(
      (r): r is Extract<ToolExecutionResult, { success: false }> => !r.success
    );
    const errors = failedResults
      .filter(r => {
        const errorType = r.error.errorType;
        // Only include execution errors (not input validation, not timeouts)
        return errorType === ToolExecutionErrorType.EXECUTION_ERROR;
      })
      .map(r => r.error);

    return {
      detected: errors.length > 0,
      errors,
    };
  }

  /**
   * Detect non-deterministic behavior by comparing multiple executions.
   * v1.5.0: Runs the same input multiple times and compares outputs.
   */
  detectNonDeterminism(
    results: ToolExecutionResult[],
    _contract: ToolContract
  ): {
    /** Whether non-deterministic behavior was detected */
    detected: boolean;
    /** Number of executions that produced different outputs */
    variationCount: number;
    /** Total number of executions compared */
    totalExecutions: number;
    /** Details about variations (if any) */
    variations?: Array<{
      executionIndex: number;
      output: unknown;
      diff: string;
    }>;
  } {
    // Filter successful results only (can't compare failed executions)
    const successfulResults = results.filter(
      (r): r is Extract<ToolExecutionResult, { success: true }> => r.success
    );

    // Need at least 2 successful executions to detect non-determinism
    if (successfulResults.length < 2) {
      return {
        detected: false,
        variationCount: 0,
        totalExecutions: successfulResults.length,
      };
    }

    // Get the first successful result as baseline
    const baseline = successfulResults[0]!;
    const baselineOutput = JSON.stringify(baseline.output);

    // Compare all other results to baseline
    const variations: Array<{
      executionIndex: number;
      output: unknown;
      diff: string;
    }> = [];

    for (let i = 1; i < successfulResults.length; i++) {
      const result = successfulResults[i]!;
      const resultOutput = JSON.stringify(result.output);

      if (resultOutput !== baselineOutput) {
        // Calculate a simple diff (first difference location)
        let diffLocation = 0;
        for (
          let j = 0;
          j < Math.min(baselineOutput.length, resultOutput.length);
          j++
        ) {
          if (baselineOutput[j] !== resultOutput[j]) {
            diffLocation = j;
            break;
          }
        }

        variations.push({
          executionIndex: i,
          output: result.output,
          diff: `Output differs at position ${diffLocation}`,
        });
      }
    }

    const detected = variations.length > 0;

    return {
      detected,
      variationCount: variations.length,
      totalExecutions: successfulResults.length,
      ...(detected ? { variations } : {}),
    };
  }
}
