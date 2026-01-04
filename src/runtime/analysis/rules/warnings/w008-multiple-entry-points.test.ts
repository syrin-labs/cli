/**
 * Tests for W008: Multiple Entry Points rule.
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

describe('W008: Multiple Entry Points', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when multiple tools have same entry point field', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_by_id',
        description: 'Get user by ID',
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
          },
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Get user by email',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' }, // Same field name
          },
          required: ['userId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user_by_id',
        description: 'Get user by ID',
        inputs: [
          {
            tool: 'get_user_by_id',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_by_id',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'by', 'id']),
      },
      {
        name: 'get_user_by_email',
        description: 'Get user by email',
        inputs: [
          {
            tool: 'get_user_by_email',
            name: 'userId', // Same field name
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_by_email',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'by', 'email']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w008Warnings = result.warnings.filter(w => w.code === 'W008');
    expect(w008Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when tools have distinct entry points', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_by_id',
        description: 'Get user by ID',
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
          },
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Get user by email',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string' }, // Different field name
          },
          required: ['email'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user_by_id',
        description: 'Get user by ID',
        inputs: [
          {
            tool: 'get_user_by_id',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_by_id',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'by', 'id']),
      },
      {
        name: 'get_user_by_email',
        description: 'Get user by email',
        inputs: [
          {
            tool: 'get_user_by_email',
            name: 'email', // Different field name
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_by_email',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'by', 'email']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w008Warnings = result.warnings.filter(w => w.code === 'W008');
    expect(w008Warnings).toHaveLength(0);
  });
});
