/**
 * Tests for W114: Input Schema Depth Limit rule.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyseTools } from '../../analyser';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { buildIndexesFromTools } from '../__test-helpers__';
import type { ToolSpec } from '../../types';

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

describe('W114: Input Schema Depth Limit', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when input schema exceeds 3 levels of nesting', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_nested_data',
        description: 'Process deeply nested data structure',
        inputSchema: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    connection: {
                      type: 'object',
                      properties: {
                        host: { type: 'string' },
                        port: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'process_nested_data',
        description: 'Process deeply nested data structure',
        inputs: [
          {
            tool: 'process_nested_data',
            name: 'config',
            type: 'object',
            required: true,
            properties: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    connection: {
                      type: 'object',
                      properties: {
                        host: { type: 'string' },
                        port: { type: 'number' },
                      },
                    },
                  },
                },
              },
            } as unknown,
          },
        ],
        outputs: [
          {
            tool: 'process_nested_data',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'nested', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools as ToolSpec[]);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools as ToolSpec[])
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w114Warnings = result.warnings.filter(w => w.code === 'W114');
    expect(w114Warnings.length).toBeGreaterThan(0);
    expect(w114Warnings[0]?.tool).toBe('process_nested_data');
    expect(w114Warnings[0]?.field).toBe('config');
    expect(w114Warnings[0]?.message).toContain('depth');
  });

  it('should pass when input schema is within 3 levels of nesting', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process data with reasonable nesting',
        inputSchema: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    host: { type: 'string' },
                    port: { type: 'number' },
                  },
                },
              },
            },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'process_data',
        description: 'Process data with reasonable nesting',
        inputs: [
          {
            tool: 'process_data',
            name: 'config',
            type: 'object',
            required: true,
            properties: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    host: { type: 'string' },
                    port: { type: 'number' },
                  },
                },
              },
            } as unknown,
          },
        ],
        outputs: [
          {
            tool: 'process_data',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'data', 'reasonable']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools as ToolSpec[]);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools as ToolSpec[])
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w114Warnings = result.warnings.filter(w => w.code === 'W114');
    expect(w114Warnings).toHaveLength(0);
  });

  it('should pass when input has no nested properties', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'simple_tool',
        description: 'Simple tool with flat schema',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'simple_tool',
        description: 'Simple tool with flat schema',
        inputs: [
          {
            tool: 'simple_tool',
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            tool: 'simple_tool',
            name: 'count',
            type: 'number',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'simple_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['simple', 'tool', 'flat']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w114Warnings = result.warnings.filter(w => w.code === 'W114');
    expect(w114Warnings).toHaveLength(0);
  });
});
