/**
 * Tests for W115: Token Cost Estimation rule.
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

describe('W115: Token Cost Estimation', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when tool has high token estimate (>1000)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    // Create a very long description and many schema properties
    const longDescription = 'A'.repeat(4000); // 4000 chars * 0.25 = 1000 tokens

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'expensive_tool',
        description: longDescription,
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'Parameter 1 description' },
            param2: { type: 'string', description: 'Parameter 2 description' },
            param3: { type: 'string', description: 'Parameter 3 description' },
            param4: { type: 'string', description: 'Parameter 4 description' },
            param5: { type: 'string', description: 'Parameter 5 description' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            result1: { type: 'string', description: 'Result 1 description' },
            result2: { type: 'string', description: 'Result 2 description' },
            result3: { type: 'string', description: 'Result 3 description' },
            result4: { type: 'string', description: 'Result 4 description' },
            result5: { type: 'string', description: 'Result 5 description' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'expensive_tool',
        description: longDescription,
        inputs: [
          {
            tool: 'expensive_tool',
            name: 'param1',
            type: 'string',
            required: true,
            description: 'Parameter 1 description',
          },
          {
            tool: 'expensive_tool',
            name: 'param2',
            type: 'string',
            required: true,
            description: 'Parameter 2 description',
          },
          {
            tool: 'expensive_tool',
            name: 'param3',
            type: 'string',
            required: true,
            description: 'Parameter 3 description',
          },
          {
            tool: 'expensive_tool',
            name: 'param4',
            type: 'string',
            required: true,
            description: 'Parameter 4 description',
          },
          {
            tool: 'expensive_tool',
            name: 'param5',
            type: 'string',
            required: true,
            description: 'Parameter 5 description',
          },
        ],
        outputs: [
          {
            tool: 'expensive_tool',
            name: 'result1',
            type: 'string',
            required: false,
            description: 'Result 1 description',
          },
          {
            tool: 'expensive_tool',
            name: 'result2',
            type: 'string',
            required: false,
            description: 'Result 2 description',
          },
          {
            tool: 'expensive_tool',
            name: 'result3',
            type: 'string',
            required: false,
            description: 'Result 3 description',
          },
          {
            tool: 'expensive_tool',
            name: 'result4',
            type: 'string',
            required: false,
            description: 'Result 4 description',
          },
          {
            tool: 'expensive_tool',
            name: 'result5',
            type: 'string',
            required: false,
            description: 'Result 5 description',
          },
        ],
        descriptionTokens: new Set(['a']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w115Warnings = result.warnings.filter(w => w.code === 'W115');
    expect(w115Warnings.length).toBeGreaterThan(0);
    expect(w115Warnings[0]?.tool).toBe('expensive_tool');
    expect(w115Warnings[0]?.message).toContain('tokens');
    expect(w115Warnings[0]?.message).toContain('context bloat');
  });

  it('should pass when tool has acceptable token estimate (<1000)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'efficient_tool',
        description: 'A simple tool for processing data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string', description: 'Input data' },
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
        name: 'efficient_tool',
        description: 'A simple tool for processing data',
        inputs: [
          {
            tool: 'efficient_tool',
            name: 'data',
            type: 'string',
            required: true,
            description: 'Input data',
          },
        ],
        outputs: [
          {
            tool: 'efficient_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['simple', 'tool', 'processing', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w115Warnings = result.warnings.filter(w => w.code === 'W115');
    expect(w115Warnings).toHaveLength(0);
  });

  it('should calculate tokens from description and schema properties', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'medium_tool',
        description: 'This is a moderately sized tool description',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' },
            param2: { type: 'string', description: 'Second parameter' },
            param3: { type: 'string', description: 'Third parameter' },
            param4: { type: 'string', description: 'Fourth parameter' },
            param5: { type: 'string', description: 'Fifth parameter' },
            param6: { type: 'string', description: 'Sixth parameter' },
            param7: { type: 'string', description: 'Seventh parameter' },
            param8: { type: 'string', description: 'Eighth parameter' },
            param9: { type: 'string', description: 'Ninth parameter' },
            param10: { type: 'string', description: 'Tenth parameter' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'medium_tool',
        description: 'This is a moderately sized tool description',
        inputs: [
          {
            tool: 'medium_tool',
            name: 'param1',
            type: 'string',
            required: true,
            description: 'First parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param2',
            type: 'string',
            required: true,
            description: 'Second parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param3',
            type: 'string',
            required: true,
            description: 'Third parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param4',
            type: 'string',
            required: true,
            description: 'Fourth parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param5',
            type: 'string',
            required: true,
            description: 'Fifth parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param6',
            type: 'string',
            required: true,
            description: 'Sixth parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param7',
            type: 'string',
            required: true,
            description: 'Seventh parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param8',
            type: 'string',
            required: true,
            description: 'Eighth parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param9',
            type: 'string',
            required: true,
            description: 'Ninth parameter',
          },
          {
            tool: 'medium_tool',
            name: 'param10',
            type: 'string',
            required: true,
            description: 'Tenth parameter',
          },
        ],
        outputs: [],
        descriptionTokens: new Set(['moderately', 'sized', 'tool']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    // 44 chars * 0.25 = 11 tokens from description
    // 10 params * 20 = 200 tokens from schema properties
    // 10 params * avg ~15 chars * 0.25 = ~37 tokens from param descriptions
    // Total should be around 248 tokens, well under 1000
    const w115Warnings = result.warnings.filter(w => w.code === 'W115');
    expect(w115Warnings).toHaveLength(0);
  });
});
