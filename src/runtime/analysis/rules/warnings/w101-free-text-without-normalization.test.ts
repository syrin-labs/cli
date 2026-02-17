/**
 * Tests for W101: Free Text Without Normalization rule.
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
vi.mock('../../semantic-embedding', () => ({
  initializeConceptEmbeddings: vi.fn().mockResolvedValue(undefined),
}));
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

describe('W101: Free Text Without Normalization', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when output is unconstrained free text', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_result',
        description: 'Get result',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' }, // Unconstrained
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_result',
        description: 'Get result',
        inputs: [],
        outputs: [
          {
            tool: 'get_result',
            name: 'result',
            type: 'string',
            required: false,
            // No enum, pattern, or description - unconstrained
          },
        ],
        descriptionTokens: new Set(['get', 'result']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w101Warnings = result.warnings.filter(w => w.code === 'W101');
    expect(w101Warnings.length).toBeGreaterThan(0);
    expect(w101Warnings[0]?.tool).toBe('get_result');
    expect(w101Warnings[0]?.field).toBe('result');
  });

  it('should pass when output has constraints', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_status',
        description: 'Get status',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive'], // Has enum constraint
            },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_status',
        description: 'Get status',
        inputs: [],
        outputs: [
          {
            tool: 'get_status',
            name: 'status',
            type: 'string',
            required: false,
            enum: ['active', 'inactive'], // Has enum
          },
        ],
        descriptionTokens: new Set(['get', 'status']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w101Warnings = result.warnings.filter(w => w.code === 'W101');
    expect(w101Warnings).toHaveLength(0);
  });
});
