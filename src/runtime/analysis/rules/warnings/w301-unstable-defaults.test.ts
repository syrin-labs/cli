/**
 * Tests for W301: Unstable Defaults rule.
 */

import { describe, it, expect } from 'vitest';
import { W301UnstableDefaults } from './w301-unstable-defaults';
import type { UnstableDefaultsContext } from './w301-unstable-defaults';

describe('W301: Unstable Defaults', () => {
  it('should have correct rule metadata', () => {
    expect(W301UnstableDefaults.id).toBe('W301');
    expect(W301UnstableDefaults.severity).toBe('warning');
    expect(W301UnstableDefaults.ruleName).toBe('Unstable Defaults');
  });

  it('should detect unstable defaults', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'test_tool',
      unstableFields: [
        {
          fieldName: 'timeout',
          reason: 'Default changes behavior significantly',
        },
        { fieldName: 'retries', reason: 'Default value is unpredictable' },
      ],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W301');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('unstable default');
  });

  it('should not detect when defaults are stable', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'test_tool',
      unstableFields: [],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it('should handle single unstable field', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'single_field_tool',
      unstableFields: [
        {
          fieldName: 'retry_count',
          reason: 'Default value affects behavior significantly',
        },
      ],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W301');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('single_field_tool');
    expect(diagnostics[0]?.message).toContain('unstable default');
    expect(diagnostics[0]?.message).toContain('retry_count');
  });

  it('should handle different reason strings (behavioral)', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'behavior_tool',
      unstableFields: [
        {
          fieldName: 'timeout',
          reason: 'Default changes behavior significantly',
        },
      ],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W301');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('behavior_tool');
    expect(diagnostics[0]?.message).toContain('behavior significantly');
  });

  it('should handle different reason strings (performance)', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'performance_tool',
      unstableFields: [
        {
          fieldName: 'cache_size',
          reason: 'Default value impacts performance unpredictably',
        },
      ],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W301');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('performance_tool');
    expect(diagnostics[0]?.message).toContain('performance unpredictably');
  });

  it('should handle empty or whitespace field names gracefully', () => {
    const context: UnstableDefaultsContext = {
      toolName: 'edge_case_tool',
      unstableFields: [
        {
          fieldName: '   ', // Whitespace only
          reason: 'Empty field name edge case',
        },
      ],
    };

    const diagnostics =
      W301UnstableDefaults.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('W301');
    expect(diagnostics[0]?.severity).toBe('warning');
    expect(diagnostics[0]?.tool).toBe('edge_case_tool');
    expect(diagnostics[0]?.message).toBeDefined();
    expect(diagnostics[0]?.message).toContain('edge_case_tool');
  });
});
