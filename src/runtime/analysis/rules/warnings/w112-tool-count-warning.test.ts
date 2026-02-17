/**
 * Tests for W112: Tool Count Warning rule.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyseTools } from '../../analyser';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { buildIndexesFromTools } from '../__test-helpers__';

// Mock dependencies
vi.mock('../../loader', () => ({ loadMCPTools: vi.fn() }));
vi.mock('../../normalizer', () => ({ normalizeTools: vi.fn() }));
vi.mock('../../indexer', () => ({ buildIndexes: vi.fn() }));
vi.mock('../../dependencies', () => ({ inferDependencies: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    plain: vi.fn(),
    blank: vi.fn(),
    heading: vi.fn(),
    label: vi.fn(),
    value: vi.fn(),
    labelValue: vi.fn(),
    numberedItem: vi.fn(),
    checkmark: vi.fn(),
    xmark: vi.fn(),
    warnSymbol: vi.fn(),
    tick: vi.fn(() => '✓'),
    cross: vi.fn(() => '✗'),
    styleText: vi.fn(text => text),
  },
}));

describe('W112: Tool Count Warning', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when server has more than 20 tools', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    // Create 25 tools (over the threshold of 20)
    const tools = Array.from({ length: 25 }, (_, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          param: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object' as const,
        properties: {
          result: { type: 'string' },
        },
      },
    }));

    vi.mocked(loadMCPTools).mockResolvedValue(tools);

    const normalizedTools = tools.map((tool, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'param',
          type: 'string',
          required: true,
        },
      ],
      outputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'result',
          type: 'string',
          required: false,
        },
      ],
      descriptionTokens: new Set(['description', 'for', 'tool']),
    }));

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w112Warnings = result.warnings.filter(w => w.code === 'W112');
    expect(w112Warnings.length).toBeGreaterThan(0);
    expect(w112Warnings[0]?.message).toContain('25');
    expect(w112Warnings[0]?.message).toContain('threshold');
  });

  it('should pass when server has 20 or fewer tools', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    // Create exactly 20 tools (at threshold)
    const tools = Array.from({ length: 20 }, (_, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          param: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object' as const,
        properties: {
          result: { type: 'string' },
        },
      },
    }));

    vi.mocked(loadMCPTools).mockResolvedValue(tools);

    const normalizedTools = tools.map((tool, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'param',
          type: 'string',
          required: true,
        },
      ],
      outputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'result',
          type: 'string',
          required: false,
        },
      ],
      descriptionTokens: new Set(['description', 'for', 'tool']),
    }));

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w112Warnings = result.warnings.filter(w => w.code === 'W112');
    expect(w112Warnings).toHaveLength(0);
  });

  it('should pass when server has fewer than 20 tools', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    // Create 5 tools (well under threshold)
    const tools = Array.from({ length: 5 }, (_, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          param: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object' as const,
        properties: {
          result: { type: 'string' },
        },
      },
    }));

    vi.mocked(loadMCPTools).mockResolvedValue(tools);

    const normalizedTools = tools.map((tool, i) => ({
      name: `tool_${i + 1}`,
      description: `Description for tool ${i + 1}`,
      inputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'param',
          type: 'string',
          required: true,
        },
      ],
      outputs: [
        {
          tool: `tool_${i + 1}`,
          name: 'result',
          type: 'string',
          required: false,
        },
      ],
      descriptionTokens: new Set(['description', 'for', 'tool']),
    }));

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w112Warnings = result.warnings.filter(w => w.code === 'W112');
    expect(w112Warnings).toHaveLength(0);
  });
});
