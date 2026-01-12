/**
 * Tests for W110: Weak Schema rule.
 */

import { describe, it, expect } from 'vitest';
import { W110WeakSchema } from './w110-weak-schema';
import type { WeakSchemaContext } from './w110-weak-schema';

describe('W110: Weak Schema', () => {
  it('should have correct rule metadata', () => {
    expect(W110WeakSchema.id).toBe('W110');
    expect(W110WeakSchema.severity).toBe('warning');
    expect(W110WeakSchema.ruleName).toBe('Weak Schema');
  });

  it('should detect schema mismatch', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: false,
      mismatchDetails: 'Input schema does not match MCP tool schema',
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W110');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('do not match');
  });

  it('should not detect when schemas match', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: true,
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it('should detect schema mismatch even when mismatchDetails is missing', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: false,
      mismatchDetails: undefined,
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W110');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toBe(
      'Tool "test_tool" contract schemas do not match actual MCP tool schemas.'
    );
  });

  it('should handle empty toolName', () => {
    const context: WeakSchemaContext = {
      toolName: '',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: false,
      mismatchDetails: 'Input schema does not match',
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W110');
    expect(diagnostics[0]?.tool).toBe('');
    expect(diagnostics[0]?.message).toContain('contract schemas do not match');
  });

  it('should include full diagnostic message with mismatch details', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: false,
      mismatchDetails:
        'Input schema structure differs: expected "location" field but found "address"',
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.message).toBe(
      'Tool "test_tool" contract schemas do not match actual MCP tool schemas. Input schema structure differs: expected "location" field but found "address"'
    );
  });

  it('should detect when only input schema mismatches', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'WrongInputSchema',
      contractOutputSchema: 'OutputSchema',
      schemasMatch: false,
      mismatchDetails: 'Only input schema does not match',
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W110');
    expect(diagnostics[0]?.message).toContain('contract schemas do not match');
  });

  it('should detect when only output schema mismatches', () => {
    const context: WeakSchemaContext = {
      toolName: 'test_tool',
      contractInputSchema: 'InputSchema',
      contractOutputSchema: 'WrongOutputSchema',
      schemasMatch: false,
      mismatchDetails: 'Only output schema does not match',
    };

    const diagnostics = W110WeakSchema.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W110');
    expect(diagnostics[0]?.message).toContain('contract schemas do not match');
  });
});
