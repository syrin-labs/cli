/**
 * Tests for E101: Missing Tool Description rule.
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

describe('E101: Missing Tool Description', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect tool with missing description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: '', // Empty description
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string', description: 'Input data' },
          },
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
        name: 'process_data',
        description: '', // Empty description
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
            description: 'Input data',
          },
        ],
        outputs: [
          {
            tool: 'process_data',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e101Errors = result.errors.filter(e => e.code === 'E101');
    expect(e101Errors.length).toBeGreaterThan(0);
    expect(e101Errors[0]?.tool).toBe('process_data');
    expect(e101Errors[0]?.message).toContain('missing a description');
  });

  it('should detect tool with whitespace-only description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: '   ', // Whitespace only
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
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
        name: 'process_data',
        description: '   ', // Whitespace only
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'process_data',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e101Errors = result.errors.filter(e => e.code === 'E101');
    expect(e101Errors.length).toBeGreaterThan(0);
    expect(e101Errors[0]?.tool).toBe('process_data');
  });

  it('should pass when tool has valid description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process and transform input data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
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
        name: 'process_data',
        description: 'Process and transform input data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'process_data',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['process', 'transform', 'input', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e101Errors = result.errors.filter(e => e.code === 'E101');
    expect(e101Errors).toHaveLength(0);
  });
});
