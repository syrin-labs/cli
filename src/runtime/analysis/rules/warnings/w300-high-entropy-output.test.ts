/**
 * Tests for W300: High Entropy Output rule.
 */

import { describe, it, expect } from 'vitest';
import { W300HighEntropyOutput } from './w300-high-entropy-output';
import type { HighEntropyContext } from './w300-high-entropy-output';

describe('W300: High Entropy Output', () => {
  it('should have correct rule metadata', () => {
    expect(W300HighEntropyOutput.id).toBe('W300');
    expect(W300HighEntropyOutput.severity).toBe('warning');
    expect(W300HighEntropyOutput.ruleName).toBe('High Entropy Output');
  });

  it('should detect high entropy output', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 0.85,
      reason: 'Output contains random values',
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W300');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('high entropy');
  });

  it('should not detect when entropy is low', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 0.5,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it('should not detect at exact threshold value (0.7)', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 0.7,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    // Threshold is > 0.7, so 0.7 itself should not trigger
    expect(diagnostics.length).toBe(0);
  });

  it('should handle extreme entropy value (0.0)', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 0.0,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it('should handle extreme entropy value (1.0)', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 1.0,
      reason: 'Maximum entropy detected',
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W300');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toBe(
      'Tool "test_tool" produces high entropy output (score: 1.00, threshold: 0.70). Maximum entropy detected'
    );
  });

  it('should handle out-of-range negative entropy value', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: -0.1,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it('should handle out-of-range entropy value greater than 1.0', () => {
    const context: HighEntropyContext = {
      toolName: 'test_tool',
      entropyScore: 1.5,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W300');
    expect(diagnostics[0]?.tool).toBe('test_tool');
  });

  it('should handle empty toolName', () => {
    const context: HighEntropyContext = {
      toolName: '',
      entropyScore: 0.85,
    };

    const diagnostics =
      W300HighEntropyOutput.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W300');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('');
    expect(diagnostics[0]?.message).toContain('high entropy');
  });
});
