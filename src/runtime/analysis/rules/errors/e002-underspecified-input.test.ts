/**
 * Tests for E002: Underspecified Required Input rule.
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

describe('E002: Underspecified Required Input', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect required input without description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' }, // No description
          },
          required: ['data'],
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
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
            // No description - should trigger E002
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
        descriptionTokens: new Set(['process', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e002Errors = result.errors.filter(e => e.code === 'E002');
    expect(e002Errors.length).toBeGreaterThan(0);
    expect(e002Errors[0]?.tool).toBe('process_data');
    expect(e002Errors[0]?.field).toBe('data');
  });

  it('should pass when required input has description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'The data to process',
            },
          },
          required: ['data'],
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
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
            description: 'The data to process', // Has description
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
        descriptionTokens: new Set(['process', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e002Errors = result.errors.filter(e => e.code === 'E002');
    expect(e002Errors).toHaveLength(0);
  });
});
