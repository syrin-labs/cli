/**
 * Tests for E008: Circular Dependency rule.
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

describe('E008: Circular Dependency', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect circular dependency between tools', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'tool_a',
        description: 'Tool A',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' },
          },
        },
      },
      {
        name: 'tool_b',
        description: 'Tool B',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'tool_a',
        description: 'Tool A',
        inputs: [
          {
            tool: 'tool_a',
            name: 'input',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'tool_a',
            name: 'output',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', 'a']),
      },
      {
        name: 'tool_b',
        description: 'Tool B',
        inputs: [
          {
            tool: 'tool_b',
            name: 'input',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'tool_b',
            name: 'output',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', 'b']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    // Create circular dependency: A -> B -> A
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_b',
        toField: 'input',
        confidence: 0.9, // High confidence
      },
      {
        fromTool: 'tool_b',
        fromField: 'output',
        toTool: 'tool_a',
        toField: 'input',
        confidence: 0.9, // High confidence
      },
    ]);

    const result = await analyseTools(mockClient);

    const e008Errors = result.errors.filter(e => e.code === 'E008');
    expect(e008Errors.length).toBeGreaterThan(0);
  });

  it('should pass when no circular dependency exists', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'tool_a',
        description: 'Tool A',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' },
          },
        },
      },
      {
        name: 'tool_b',
        description: 'Tool B',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
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
        name: 'tool_a',
        description: 'Tool A',
        inputs: [],
        outputs: [
          {
            tool: 'tool_a',
            name: 'output',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', 'a']),
      },
      {
        name: 'tool_b',
        description: 'Tool B',
        inputs: [
          {
            tool: 'tool_b',
            name: 'input',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'tool_b',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', 'b']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    // Linear dependency: A -> B (no cycle)
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_b',
        toField: 'input',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e008Errors = result.errors.filter(e => e.code === 'E008');
    expect(e008Errors).toHaveLength(0);
  });
});
