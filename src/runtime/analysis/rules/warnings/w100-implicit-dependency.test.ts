/**
 * Tests for W100: Implicit Dependency rule.
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

describe('W100: Implicit Dependency', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  /**
   * Helper to create mock tools with parameterized descriptions.
   */
  async function createMockTools(
    descriptionSuffix: string,
    descriptionTokens: string[]
  ) {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');

    const rawTools = [
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
        description: `Get user details${descriptionSuffix}`, // Parameterized description
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
    ];

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
        description: `Get user details${descriptionSuffix}`, // Parameterized description
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
        descriptionTokens: new Set([
          'get',
          'user',
          'details',
          ...descriptionTokens,
        ]),
      },
    ];

    vi.mocked(loadMCPTools).mockResolvedValue(rawTools);
    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );

    return normalizedTools;
  }

  it('should warn when dependency is implicit (not mentioned in description)', async () => {
    const { inferDependencies } = await import('../../dependencies');

    await createMockTools('', []); // Doesn't mention get_user_id
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

    const w100Warnings = result.warnings.filter(w => w.code === 'W100');
    expect(w100Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when dependency is explicit (mentioned in description)', async () => {
    const { inferDependencies } = await import('../../dependencies');

    await createMockTools(' using get_user_id', ['using', 'get', 'user', 'id']); // Mentions get_user_id
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

    const w100Warnings = result.warnings.filter(w => w.code === 'W100');
    expect(w100Warnings).toHaveLength(0);
  });
});
