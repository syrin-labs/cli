/**
 * Tests for W003: Missing Examples rule.
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

describe('W003: Missing Examples', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when user-facing input lacks examples', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_location',
        description: 'Get user location',
        inputSchema: {
          type: 'object',
          properties: {
            userQuery: {
              type: 'string',
              description: 'User query about location',
            },
          },
          required: ['userQuery'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user_location',
        description: 'Get user location',
        inputs: [
          {
            tool: 'get_user_location',
            name: 'userQuery',
            type: 'string',
            required: true,
            description: 'User query about location',
            // No example - should trigger W003
          },
        ],
        outputs: [
          {
            tool: 'get_user_location',
            name: 'location',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'location']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w003Warnings = result.warnings.filter(w => w.code === 'W003');
    expect(w003Warnings.length).toBeGreaterThan(0);
    expect(w003Warnings[0]?.tool).toBe('get_user_location');
    expect(w003Warnings[0]?.field).toBe('userQuery');
  });

  it('should pass when user-facing input has examples', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_location',
        description: 'Get user location',
        inputSchema: {
          type: 'object',
          properties: {
            userQuery: {
              type: 'string',
              description: 'User query about location',
              examples: ['Where am I?', 'What is my current location?'],
            },
          },
          required: ['userQuery'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user_location',
        description: 'Get user location',
        inputs: [
          {
            tool: 'get_user_location',
            name: 'userQuery',
            type: 'string',
            required: true,
            description: 'User query about location',
            // The normalizer takes the first entry from the examples array and uses it as the singular example
            example: 'Where am I?', // Has example
          },
        ],
        outputs: [
          {
            tool: 'get_user_location',
            name: 'location',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'location']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w003Warnings = result.warnings.filter(w => w.code === 'W003');
    expect(w003Warnings).toHaveLength(0);
  });
});
