/**
 * Tests for W105: Optional As Required rule.
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

describe('W105: Optional As Required', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when nullable output is wired to required input', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_optional_data',
        description: 'Get optional data',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            data: {
              type: ['string', 'null'], // Nullable
            },
          },
        },
      },
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
          required: ['data'], // Required
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
        name: 'get_optional_data',
        description: 'Get optional data',
        inputs: [],
        outputs: [
          {
            tool: 'get_optional_data',
            name: 'data',
            type: 'string',
            required: false,
            nullable: true, // Nullable
          },
        ],
        descriptionTokens: new Set(['get', 'optional', 'data']),
      },
      {
        name: 'process_data',
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: true, // Required
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
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_optional_data',
        fromField: 'data',
        toTool: 'process_data',
        toField: 'data',
        confidence: 0.9, // High confidence
      },
    ]);

    const result = await analyseTools(mockClient);

    const w105Warnings = result.warnings.filter(w => w.code === 'W105');
    expect(w105Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when nullable output is wired to optional input', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_optional_data',
        description: 'Get optional data',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            data: {
              type: ['string', 'null'],
            },
          },
        },
      },
      {
        name: 'process_data',
        description: 'Process data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
          // Not required
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
        name: 'get_optional_data',
        description: 'Get optional data',
        inputs: [],
        outputs: [
          {
            tool: 'get_optional_data',
            name: 'data',
            type: 'string',
            required: false,
            nullable: true,
          },
        ],
        descriptionTokens: new Set(['get', 'optional', 'data']),
      },
      {
        name: 'process_data',
        description: 'Process data',
        inputs: [
          {
            tool: 'process_data',
            name: 'data',
            type: 'string',
            required: false, // Optional
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
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'get_optional_data',
        fromField: 'data',
        toTool: 'process_data',
        toField: 'data',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const w105Warnings = result.warnings.filter(w => w.code === 'W105');
    expect(w105Warnings).toHaveLength(0);
  });
});
