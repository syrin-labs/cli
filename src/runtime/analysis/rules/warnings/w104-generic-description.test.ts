/**
 * Tests for W104: Generic Description rule.
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

describe('W104: Generic Description', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when tool has generic description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: 'Handle it', // Generic: has "handle" verb but "it" is not a concrete noun
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
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
        description: 'Handle it', // Generic: has "handle" verb but "it" is not a concrete noun
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
        descriptionTokens: new Set(['handle', 'it']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w104Warnings = result.warnings.filter(w => w.code === 'W104');
    expect(w104Warnings.length).toBeGreaterThan(0);
    expect(w104Warnings[0]?.tool).toBe('process_data');
  });

  it('should pass when tool has specific description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_invoice',
        description: 'Process invoice data and extract line items', // Specific description
        inputSchema: {
          type: 'object',
          properties: {
            invoiceData: { type: 'string' },
          },
          required: ['invoiceData'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            lineItems: { type: 'array' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'process_invoice',
        description: 'Process invoice data and extract line items',
        inputs: [
          {
            tool: 'process_invoice',
            name: 'invoiceData',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'process_invoice',
            name: 'lineItems',
            type: 'array',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'process',
          'invoice',
          'data',
          'extract',
          'line',
          'items',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w104Warnings = result.warnings.filter(w => w.code === 'W104');
    expect(w104Warnings).toHaveLength(0);
  });
});
