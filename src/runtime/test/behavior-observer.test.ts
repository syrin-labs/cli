/**
 * Tests for behavior observer.
 */

import { describe, it, expect } from 'vitest';
import { BehaviorObserver } from './behavior-observer';
import { IOMonitor } from '@/runtime/sandbox';
import type {
  ToolExecutionResult,
  ToolExecutionError,
} from '@/runtime/sandbox';
import { ToolExecutionErrorType } from '@/runtime/sandbox';
import type { ToolContract } from './contract-types';

/**
 * Factory function to create ToolExecutionError instances for testing.
 */
function createToolExecutionError(
  message: string,
  errorType: ToolExecutionErrorType,
  context?: Record<string, unknown>
): ToolExecutionError {
  const error = new Error(message) as ToolExecutionError;
  error.errorType = errorType;
  if (context) {
    error.context = context;
  }
  return error;
}

describe('BehaviorObserver', () => {
  const observer = new BehaviorObserver();

  describe('detectSideEffects', () => {
    it('should detect side effects when contract requires none', () => {
      const contract: ToolContract = {
        version: 1,
        tool: 'test_tool',
        contract: {
          input_schema: 'Input',
          output_schema: 'Output',
        },
        guarantees: {
          side_effects: 'none',
        },
      };

      const tempDir = '/tmp/sandbox';
      const projectRoot = '/project';
      const ioMonitor = new IOMonitor(tempDir, projectRoot);

      // Record a side effect (write to project file)
      ioMonitor.recordFSOperation('write', '/project/config.json');

      const result = observer.detectSideEffects(ioMonitor, contract);

      expect(result.detected).toBe(true);
      expect(result.sideEffects.length).toBeGreaterThan(0);
    });

    it('should not detect side effects when none occur', () => {
      const contract: ToolContract = {
        version: 1,
        tool: 'test_tool',
        contract: {
          input_schema: 'Input',
          output_schema: 'Output',
        },
        guarantees: {
          side_effects: 'none',
        },
      };

      const tempDir = '/tmp/sandbox';
      const projectRoot = '/project';
      const ioMonitor = new IOMonitor(tempDir, projectRoot);

      // Only temp dir operations (not side effects)
      ioMonitor.recordFSOperation('write', '/tmp/sandbox/temp.txt');

      const result = observer.detectSideEffects(ioMonitor, contract);

      expect(result.detected).toBe(false);
    });
  });

  describe('checkOutputSize', () => {
    it('should detect output size exceeding limit', () => {
      const contract: ToolContract = {
        version: 1,
        tool: 'test_tool',
        contract: {
          input_schema: 'Input',
          output_schema: 'Output',
        },
        guarantees: {
          max_output_size: '1kb',
        },
      };

      // Create large output (2KB)
      const largeOutput = 'x'.repeat(2048);
      const results: ToolExecutionResult[] = [
        { success: true, output: largeOutput, executionTime: 100 },
      ];

      const sizeResults = observer.checkOutputSize(results, contract);

      expect(sizeResults[0]?.exceedsLimit).toBe(true);
      expect(sizeResults[0]?.actualSize).toBeGreaterThan(
        sizeResults[0]?.maxSize
      );
    });

    it('should pass when output size is within limit', () => {
      const contract: ToolContract = {
        version: 1,
        tool: 'test_tool',
        contract: {
          input_schema: 'Input',
          output_schema: 'Output',
        },
        guarantees: {
          max_output_size: '10kb',
        },
      };

      const smallOutput = 'small';
      const results: ToolExecutionResult[] = [
        { success: true, output: smallOutput, executionTime: 100 },
      ];

      const sizeResults = observer.checkOutputSize(results, contract);

      expect(sizeResults[0]?.exceedsLimit).toBe(false);
    });

    it('should use default limit when not specified', () => {
      const contract: ToolContract = {
        version: 1,
        tool: 'test_tool',
        contract: {
          input_schema: 'Input',
          output_schema: 'Output',
        },
      };

      const results: ToolExecutionResult[] = [
        { success: true, output: 'test', executionTime: 100 },
      ];

      const sizeResults = observer.checkOutputSize(results, contract, 50);

      expect(sizeResults[0]?.maxSize).toBe(50 * 1024);
    });
  });

  describe('detectUnboundedExecution', () => {
    it('should detect timeout', () => {
      const error = createToolExecutionError(
        'Timeout',
        ToolExecutionErrorType.TIMEOUT
      );
      const results: ToolExecutionResult[] = [
        { success: false, error, executionTime: 100, timedOut: true },
      ];

      const result = observer.detectUnboundedExecution(results);

      expect(result.detected).toBe(true);
      expect(result.timedOut).toBe(true);
    });

    it('should detect connection errors', () => {
      const error = createToolExecutionError(
        'Connection failed',
        ToolExecutionErrorType.CONNECTION_ERROR
      );

      const results: ToolExecutionResult[] = [
        {
          success: false,
          error,
          executionTime: 100,
        },
      ];

      const result = observer.detectUnboundedExecution(results);

      expect(result.detected).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not detect issues when execution succeeds', () => {
      const results: ToolExecutionResult[] = [
        { success: true, output: { value: 'success' }, executionTime: 100 },
      ];

      const result = observer.detectUnboundedExecution(results);

      expect(result.detected).toBe(false);
    });
  });
});
