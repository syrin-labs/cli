/**
 * Tests for E501: Hidden Dependency rule.
 */

import { describe, it, expect } from 'vitest';
import { E501HiddenDependency } from './e501-hidden-dependency';
import type { HiddenDependencyContext } from './e501-hidden-dependency';

describe('E501: Hidden Dependency', () => {
  it('should have correct rule metadata', () => {
    expect(E501HiddenDependency.id).toBe('E501');
    expect(E501HiddenDependency.severity).toBe('error');
    expect(E501HiddenDependency.ruleName).toBe('Hidden Dependency');
  });

  it('should detect hidden dependencies', () => {
    const context: HiddenDependencyContext = {
      toolName: 'test_tool',
      hiddenDependencies: [
        { toolName: 'helper_tool', timestamp: Date.now() },
        { toolName: 'another_tool', timestamp: Date.now() },
      ],
      declaredDependencies: [],
    };

    const diagnostics =
      E501HiddenDependency.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E501');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('called other tools');
    expect(diagnostics[0]?.suggestion).toBeDefined();
  });

  it('should not detect when dependencies are declared', () => {
    const context: HiddenDependencyContext = {
      toolName: 'test_tool',
      hiddenDependencies: [],
      declaredDependencies: ['helper_tool'],
    };

    const diagnostics =
      E501HiddenDependency.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(0);
  });

  it("should detect missing dependencies (declared but don't exist)", () => {
    const context: HiddenDependencyContext = {
      toolName: 'test_tool',
      hiddenDependencies: [],
      missingDependencies: ['nonexistent_tool', 'another_missing_tool'],
      declaredDependencies: [
        'nonexistent_tool',
        'another_missing_tool',
        'existing_tool',
      ],
    };

    const diagnostics =
      E501HiddenDependency.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E501');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain(
      "declares dependencies that don't exist"
    );
    expect(diagnostics[0]?.message).toContain('nonexistent_tool');
    expect(diagnostics[0]?.message).toContain('another_missing_tool');
    expect(diagnostics[0]?.suggestion).toBeDefined();
    expect(diagnostics[0]?.suggestion).toContain('nonexistent_tool');
  });

  it('should detect both hidden and missing dependencies', () => {
    const context: HiddenDependencyContext = {
      toolName: 'test_tool',
      hiddenDependencies: [{ toolName: 'helper_tool', timestamp: Date.now() }],
      missingDependencies: ['nonexistent_tool'],
      declaredDependencies: ['nonexistent_tool'],
    };

    const diagnostics =
      E501HiddenDependency.checkWithBehavioralContext(context);

    expect(diagnostics.length).toBe(2);
    expect(diagnostics[0]?.message).toContain('called other tools');
    expect(diagnostics[1]?.message).toContain(
      "declares dependencies that don't exist"
    );
  });
});
