/**
 * Tests for E103: Type Mismatch rule.
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

describe('E103: Type Mismatch', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect type mismatch in dependency chain', async () => {
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
        description: 'Get user details',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'number' }, // Type mismatch: string -> number
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
        description: 'Get user details',
        inputs: [
          {
            tool: 'get_user_details',
            name: 'userId',
            type: 'number', // Incompatible with string
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
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_user_id',
        fromField: 'userId',
        toTool: 'get_user_details',
        toField: 'userId',
        confidence: 0.9, // High confidence
      },
    ]);

    const result = await analyseTools(mockClient);

    const e103Errors = result.errors.filter(e => e.code === 'E103');
    expect(e103Errors.length).toBeGreaterThan(0);
  });

  it('should pass when types match in dependency chain', async () => {
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
        description: 'Get user details',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' }, // Types match
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
        description: 'Get user details',
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
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_user_id',
        fromField: 'userId',
        toTool: 'get_user_details',
        toField: 'userId',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e103Errors = result.errors.filter(e => e.code === 'E103');
    expect(e103Errors).toHaveLength(0);
  });
});
