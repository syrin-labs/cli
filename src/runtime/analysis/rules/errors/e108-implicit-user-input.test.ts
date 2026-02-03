/**
 * Tests for E108: Implicit User Input rule.
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

describe('E108: Implicit User Input', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect required input with no explicit source', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_user_query',
        description: 'Process user query',
        inputSchema: {
          type: 'object',
          properties: {
            userQuery: { type: 'string' },
          },
          required: ['userQuery'], // Required but no tool provides it
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
        name: 'process_user_query',
        description: 'Process user query',
        inputs: [
          {
            tool: 'process_user_query',
            name: 'userQuery',
            type: 'string',
            required: true, // Required but no explicit source
          },
        ],
        outputs: [
          {
            tool: 'process_user_query',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'user', 'query']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]); // No dependencies

    const result = await analyseTools(mockClient);

    const e108Errors = result.errors.filter(e => e.code === 'E108');
    expect(e108Errors.length).toBeGreaterThan(0);
    expect(e108Errors[0]?.tool).toBe('process_user_query');
    expect(e108Errors[0]?.field).toBe('userQuery');
  });

  it('should pass when required input has explicit source', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_query',
        description: 'Get query',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
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
        description: 'Get query',
        inputs: [],
        outputs: [
          {
            tool: 'get_query',
            name: 'query',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'query']),
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
    // Has explicit source
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_query',
        fromField: 'query',
        toTool: 'process_query',
        toField: 'query',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e108Errors = result.errors.filter(e => e.code === 'E108');
    expect(e108Errors).toHaveLength(0);
  });
});
