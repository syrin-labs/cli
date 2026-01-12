/**
 * Tests for E100: Missing Output Schema rule.
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

describe('E100: Missing Output Schema', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect tool without output schema', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        // No outputSchema
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user',
        description: 'Get user information',
        inputs: [
          {
            tool: 'get_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [], // No outputs - should trigger E100
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e100Errors = result.errors.filter(e => e.code === 'E100');
    expect(e100Errors.length).toBeGreaterThan(0);
    expect(e100Errors[0]?.tool).toBe('get_user');
    expect(result.verdict).toBe('fail');
  });

  it('should pass when tool has output schema', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
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
        description: 'Get user information',
        inputs: [
          {
            tool: 'get_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
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
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e100Errors = result.errors.filter(e => e.code === 'E100');
    expect(e100Errors).toHaveLength(0);
  });
});
