/**
 * Tests for W001: Implicit Dependency rule.
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

describe('W001: Implicit Dependency', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when dependency is implicit (not mentioned in description)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_id',
        description: 'Get user ID',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
      {
        name: 'get_user_details',
        description: 'Get user details', // Doesn't mention get_user_id
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
    ]);

    const normalizedTools = [
      {
        name: 'get_user_id',
        description: 'Get user ID',
        inputs: [],
        outputs: [
          {
            tool: 'get_user_id',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'id']),
      },
      {
        name: 'get_user_details',
        description: 'Get user details', // Doesn't mention get_user_id
        inputs: [
          {
            tool: 'get_user_details',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_details',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'details']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    // Medium confidence dependency (0.6-0.8) - implicit
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_user_id',
        fromField: 'userId',
        toTool: 'get_user_details',
        toField: 'userId',
        confidence: 0.7, // Medium confidence
      },
    ]);

    const result = await analyseTools(mockClient);

    const w001Warnings = result.warnings.filter(w => w.code === 'W001');
    expect(w001Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when dependency is explicit (mentioned in description)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user_id',
        description: 'Get user ID',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
      {
        name: 'get_user_details',
        description: 'Get user details using get_user_id', // Mentions get_user_id
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
    ]);

    const normalizedTools = [
      {
        name: 'get_user_id',
        description: 'Get user ID',
        inputs: [],
        outputs: [
          {
            tool: 'get_user_id',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'id']),
      },
      {
        name: 'get_user_details',
        description: 'Get user details using get_user_id', // Mentions get_user_id
        inputs: [
          {
            tool: 'get_user_details',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_details',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'details', 'using', 'get', 'user', 'id']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_user_id',
        fromField: 'userId',
        toTool: 'get_user_details',
        toField: 'userId',
        confidence: 0.7,
      },
    ]);

    const result = await analyseTools(mockClient);

    const w001Warnings = result.warnings.filter(w => w.code === 'W001');
    expect(w001Warnings).toHaveLength(0);
  });
});
