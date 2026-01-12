/**
 * Tests for E000: Tool Not Found rule.
 */

import { describe, it, expect } from 'vitest';
import { E000ToolNotFound } from './e000-tool-not-found';
import type { ToolNotFoundContext } from './e000-tool-not-found';

describe('E000: Tool Not Found', () => {
  it('should have correct rule metadata', () => {
    expect(E000ToolNotFound.id).toBe('E000');
    expect(E000ToolNotFound.severity).toBe('error');
    expect(E000ToolNotFound.ruleName).toBe('Tool Not Found');
  });

  it('should detect tool not found', () => {
    const context: ToolNotFoundContext = {
      toolName: 'test_tool',
      scriptName: 'server.py',
    };

    const diagnostics = E000ToolNotFound.checkWithRuntimeContext(context);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0]?.code).toBe('E000');
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.tool).toBe('test_tool');
    expect(diagnostics[0]?.message).toContain('not found in MCP server');
  });
});
