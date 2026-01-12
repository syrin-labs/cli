/**
 * Tests for W108: Hidden Side Effects rule.
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

describe('W108: Hidden Side Effects', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when tool suggests mutation but schema does not reflect it', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Create user', // Suggests mutation
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }, // Only returns message, not the created user
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'create_user',
        description: 'Create user', // Suggests mutation
        inputs: [
          {
            tool: 'create_user',
            name: 'name',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'create_user',
            name: 'message',
            type: 'string',
            required: false,
            // No output that reflects the created user
          },
        ],
        descriptionTokens: new Set(['create', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w108Warnings = result.warnings.filter(w => w.code === 'W108');
    expect(w108Warnings.length).toBeGreaterThan(0);
    expect(w108Warnings[0]?.tool).toBe('create_user');
    // Verify diagnostic message provides helpful guidance
    expect(w108Warnings[0]?.message).toBeDefined();
    expect(w108Warnings[0]?.message).toContain('side effects');
    expect(w108Warnings[0]?.message).toContain('create_user');
  });

  it('should pass when tool schema reflects mutation', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Create user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' }, // Returns created user ID
            name: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'create_user',
        description: 'Create user',
        inputs: [
          {
            tool: 'create_user',
            name: 'name',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'create_user',
            name: 'userId',
            type: 'string',
            required: false,
            // Returns created user ID - reflects mutation
          },
          {
            tool: 'create_user',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['create', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w108Warnings = result.warnings.filter(w => w.code === 'W108');
    expect(w108Warnings).toHaveLength(0);
  });
});
