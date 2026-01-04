/**
 * Tests for W010: Output Not Reusable rule.
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

describe('W010: Output Not Reusable', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when output is only for natural language display', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_message',
        description: 'Get message',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }, // Display-only indicator
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_message',
        description: 'Get message',
        inputs: [],
        outputs: [
          {
            tool: 'get_message',
            name: 'message', // Display-only indicator
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'message']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w010Warnings = result.warnings.filter(w => w.code === 'W010');
    expect(w010Warnings.length).toBeGreaterThan(0);
    expect(w010Warnings[0]?.tool).toBe('get_message');
    // W010 doesn't set field, only tool
    expect(w010Warnings[0]?.field).toBeUndefined();
  });

  it('should pass when output is structured for reuse', async () => {
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
            userId: { type: 'string' },
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
            name: 'userId',
            type: 'string',
            required: false,
          },
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

    const w010Warnings = result.warnings.filter(w => w.code === 'W010');
    expect(w010Warnings).toHaveLength(0);
  });
});
