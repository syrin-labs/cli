/**
 * Tests for W117: Idempotency Signal Missing rule.
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
  isConceptMatch: vi.fn(),
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

describe('W117: Idempotency Signal Missing', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when mutation tool lacks idempotency signal', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'delete_user',
        description: 'Delete a user from the system',
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
            success: { type: 'boolean' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'delete_user',
        description: 'Delete a user from the system',
        descriptionEmbedding: [0.1, 0.2, 0.3],
        inputs: [
          {
            tool: 'delete_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'delete_user',
            name: 'success',
            type: 'boolean',
            required: false,
          },
        ],
        descriptionTokens: new Set(['delete', 'user', 'from', 'the', 'system']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    // Mock isConceptMatch to return true for MUTATION and false for IDEMPOTENT
    vi.mocked(isConceptMatch).mockImplementation((embedding, category) => {
      if (category === 'MUTATION') return true;
      if (category === 'IDEMPOTENT') return false;
      return false;
    });

    const result = await analyseTools(mockClient);

    const w117Warnings = result.warnings.filter(w => w.code === 'W117');
    expect(w117Warnings.length).toBeGreaterThan(0);
    expect(w117Warnings[0]?.tool).toBe('delete_user');
    expect(w117Warnings[0]?.message).toContain('idempotency');
  });

  it('should pass when mutation tool has idempotency signal', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'update_user',
        description:
          'Update user information. This operation is idempotent and safe to retry.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            data: { type: 'object' },
          },
          required: ['userId', 'data'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'update_user',
        description:
          'Update user information. This operation is idempotent and safe to retry.',
        descriptionEmbedding: [0.1, 0.2, 0.3],
        inputs: [
          {
            tool: 'update_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
          { tool: 'update_user', name: 'data', type: 'object', required: true },
        ],
        outputs: [
          {
            tool: 'update_user',
            name: 'success',
            type: 'boolean',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'update',
          'user',
          'information',
          'this',
          'operation',
          'is',
          'idempotent',
          'and',
          'safe',
          'to',
          'retry',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    // Mock isConceptMatch to return true for both MUTATION and IDEMPOTENT
    vi.mocked(isConceptMatch).mockImplementation((embedding, category) => {
      if (category === 'MUTATION') return true;
      if (category === 'IDEMPOTENT') return true;
      return false;
    });

    const result = await analyseTools(mockClient);

    const w117Warnings = result.warnings.filter(w => w.code === 'W117');
    expect(w117Warnings).toHaveLength(0);
  });

  it('should not warn for non-mutation tools', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information from the database',
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
            user: { type: 'object' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user',
        description: 'Get user information from the database',
        descriptionEmbedding: [0.1, 0.2, 0.3],
        inputs: [
          { tool: 'get_user', name: 'userId', type: 'string', required: true },
        ],
        outputs: [
          { tool: 'get_user', name: 'user', type: 'object', required: false },
        ],
        descriptionTokens: new Set([
          'get',
          'user',
          'information',
          'from',
          'the',
          'database',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    // Mock isConceptMatch to return false for MUTATION (it's a read operation)
    vi.mocked(isConceptMatch).mockImplementation((embedding, category) => {
      if (category === 'MUTATION') return false;
      if (category === 'IDEMPOTENT') return false;
      return false;
    });

    const result = await analyseTools(mockClient);

    const w117Warnings = result.warnings.filter(w => w.code === 'W117');
    expect(w117Warnings).toHaveLength(0);
  });
});
