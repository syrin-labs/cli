/**
 * Tests for E109: Non-Serializable Output rule.
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
    styleText: vi.fn((text) => text),
  },
}));

describe('E109: Non-Serializable Output', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect non-serializable output type', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_function',
        description: 'Get function',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            func: { type: 'function' }, // Non-serializable
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_function',
        description: 'Get function',
        inputs: [],
        outputs: [
          {
            tool: 'get_function',
            name: 'func',
            type: 'function', // Non-serializable
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'function']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e109Errors = result.errors.filter(e => e.code === 'E109');
    expect(e109Errors.length).toBeGreaterThan(0);
    expect(e109Errors[0]?.tool).toBe('get_function');
    expect(e109Errors[0]?.field).toBe('func');
  });

  it('should pass when output is serializable', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_data',
        description: 'Get data',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
            active: { type: 'boolean' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_data',
        description: 'Get data',
        inputs: [],
        outputs: [
          {
            tool: 'get_data',
            name: 'name',
            type: 'string', // Serializable
            required: false,
          },
          {
            tool: 'get_data',
            name: 'count',
            type: 'number', // Serializable
            required: false,
          },
          {
            tool: 'get_data',
            name: 'active',
            type: 'boolean', // Serializable
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e109Errors = result.errors.filter(e => e.code === 'E109');
    expect(e109Errors).toHaveLength(0);
  });
});
