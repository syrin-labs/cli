/**
 * Tests for E004: Free Text Propagation rule.
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

describe('E004: Free Text Propagation', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect free text propagation through dependency chain', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_query',
        description: 'Get user query',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }, // Free text - no constraints
          },
        },
      },
      {
        name: 'process_query',
        description: 'Process query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
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
        name: 'get_query',
        description: 'Get user query',
        inputs: [],
        outputs: [
          {
            tool: 'get_query',
            name: 'query',
            type: 'string',
            required: false,
            // No enum, pattern, or description - free text
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'query']),
      },
      {
        name: 'process_query',
        description: 'Process query',
        inputs: [
          {
            tool: 'process_query',
            name: 'query',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'process_query',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'query']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_query',
        fromField: 'query',
        toTool: 'process_query',
        toField: 'query',
        confidence: 0.9, // High confidence
      },
    ]);

    const result = await analyseTools(mockClient);

    const e004Errors = result.errors.filter(e => e.code === 'E004');
    expect(e004Errors.length).toBeGreaterThan(0);
  });

  it('should pass when text has constraints (enum or pattern)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_status',
        description: 'Get status',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive'], // Has enum constraint
            },
          },
        },
      },
      {
        name: 'process_status',
        description: 'Process status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
            },
          },
          required: ['status'],
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
        name: 'get_status',
        description: 'Get status',
        inputs: [],
        outputs: [
          {
            tool: 'get_status',
            name: 'status',
            type: 'string',
            required: false,
            enum: ['active', 'inactive'], // Has enum
          },
        ],
        descriptionTokens: new Set(['get', 'status']),
      },
      {
        name: 'process_status',
        description: 'Process status',
        inputs: [
          {
            tool: 'process_status',
            name: 'status',
            type: 'string',
            required: true,
            enum: ['active', 'inactive'], // Has enum
          },
        ],
        outputs: [
          {
            tool: 'process_status',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'status']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_status',
        fromField: 'status',
        toTool: 'process_status',
        toField: 'status',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e004Errors = result.errors.filter(e => e.code === 'E004');
    expect(e004Errors).toHaveLength(0);
  });
});
