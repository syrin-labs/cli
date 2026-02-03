/**
 * Tests for W103: Overloaded Responsibility rule.
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

describe('W103: Overloaded Responsibility', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when tool has multiple responsibilities', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'user_tool',
        description: 'Get user, create user, delete user, and update user', // 4 verbs (>3) and multiple intents
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string' },
          },
          required: ['action'],
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
        name: 'user_tool',
        description: 'Get user, create user, delete user, and update user', // 4 verbs (>3) and multiple intents
        inputs: [
          {
            tool: 'user_tool',
            name: 'action',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'user_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'get',
          'user',
          'create',
          'user',
          'delete',
          'user',
          'and',
          'update',
          'user',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w103Warnings = result.warnings.filter(w => w.code === 'W103');
    expect(w103Warnings).toHaveLength(1);
    expect(w103Warnings[0]?.tool).toBe('user_tool');
  });

  it('should pass when tool has single responsibility', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information', // Single verb
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
        name: 'get_user',
        description: 'Get user information', // Single verb
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

    const w103Warnings = result.warnings.filter(w => w.code === 'W103');
    expect(w103Warnings).toHaveLength(0);
  });
});
