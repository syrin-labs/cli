/**
 * Tests for E102: Underspecified Required Input rule.
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

describe('E102: Underspecified Required Input', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect required input without description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' }, // No description
          },
          required: ['data'],
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
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
            // No description - should trigger E102
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
        descriptionTokens: new Set(['process', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e102Errors = result.errors.filter(e => e.code === 'E102');
    expect(e102Errors.length).toBeGreaterThan(0);
    expect(e102Errors[0]?.tool).toBe('process_data');
    expect(e102Errors[0]?.field).toBe('data');
  });

  it('should pass when required input has description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'The data to process',
            },
          },
          required: ['data'],
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
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true,
            description: 'The data to process', // Has description
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
        descriptionTokens: new Set(['process', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e102Errors = result.errors.filter(e => e.code === 'E102');
    expect(e102Errors).toHaveLength(0);
  });

  it('should detect optional input without description (catches unannotated parameters)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'order_food',
        description: 'Recommend food based on weather conditions',
        inputSchema: {
          type: 'object',
          properties: {
            weather: { type: 'string' }, // No description, optional (FastMCP makes unannotated params optional)
          },
          // Not in required array - optional
        },
        outputSchema: {
          type: 'object',
          properties: {
            food: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'order_food',
        description: 'Recommend food based on weather conditions',
        inputs: [
          {
            tool: 'order_food',
            name: 'weather',
            type: 'string',
            required: false, // Optional parameter
            // No description - should trigger E102
          },
        ],
        outputs: [
          {
            tool: 'order_food',
            name: 'food',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'recommend',
          'food',
          'based',
          'weather',
          'conditions',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    // Optional parameters without descriptions are flagged as warnings, not errors
    const e102Warnings = result.warnings.filter(e => e.code === 'E102');
    expect(e102Warnings.length).toBeGreaterThan(0);
    expect(e102Warnings[0]?.tool).toBe('order_food');
    expect(e102Warnings[0]?.field).toBe('weather');
    expect(e102Warnings[0]?.message).toContain('Optional parameter');
  });
});
