/**
 * Tests for W106: Broad Output Schema rule.
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
  logger: {
    error: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
    blank: vi.fn(),
  },
}));

describe('W106: Broad Output Schema', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when output type is "any"', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_data',
        description: 'Get data',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'any' }, // Too broad
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_data',
        description: 'Get data',
        inputs: [],
        outputs: [
          {
            tool: 'get_data',
            name: 'result',
            type: 'any', // Too broad
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w106Warnings = result.warnings.filter(w => w.code === 'W106');
    expect(w106Warnings.length).toBeGreaterThan(0);
    expect(w106Warnings[0]?.tool).toBe('get_data');
    expect(w106Warnings[0]?.field).toBe('result');
  });

  it('should warn when output is object with no properties', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_data',
        description: 'Get data',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: {},
            },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_data',
        description: 'Get data',
        inputs: [],
        outputs: [
          {
            tool: 'get_data',
            name: 'result',
            type: 'object',
            required: false,
            properties: [], // No properties
          },
        ],
        descriptionTokens: new Set(['get', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w106Warnings = result.warnings.filter(w => w.code === 'W106');
    expect(w106Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when output has specific type and properties', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user',
        description: 'Get user',
        inputs: [],
        outputs: [
          {
            tool: 'get_user',
            name: 'name',
            type: 'string',
            required: false,
          },
          {
            tool: 'get_user',
            name: 'email',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w106Warnings = result.warnings.filter(w => w.code === 'W106');
    expect(w106Warnings).toHaveLength(0);
  });
});
