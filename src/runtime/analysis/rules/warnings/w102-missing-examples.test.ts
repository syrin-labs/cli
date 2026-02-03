/**
 * Tests for W102: Missing Examples rule.
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

describe('W102: Missing Examples', () => {
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
            // No example - should trigger W102
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

    const w102Warnings = result.warnings.filter(w => w.code === 'W102');
    expect(w102Warnings.length).toBeGreaterThan(0);
    expect(w102Warnings[0]?.tool).toBe('get_user_location');
    expect(w102Warnings[0]?.field).toBe('userQuery');
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

    const w103Warnings = result.warnings.filter(w => w.code === 'W102');
    expect(w103Warnings).toHaveLength(0);
  });
});
