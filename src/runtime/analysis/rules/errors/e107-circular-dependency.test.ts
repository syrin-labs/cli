/**
 * Tests for E107: Circular Dependency rule.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyseTools } from '../../analyser';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { buildIndexesFromTools } from '../__test-helpers__';
import type { RawTool, ToolSpec } from '../../types';

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

describe('E107: Circular Dependency', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  /**
   * Helper to setup mock tools.
   */
  async function setupMockTools(config?: {
    rawTools?: RawTool[];
    normalizedTools?: ToolSpec[];
  }) {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');

    const rawTools = config?.rawTools || [
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
    ];

    const normalizedTools = config?.normalizedTools || [
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

    vi.mocked(loadMCPTools).mockResolvedValue(rawTools);
    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );

    return { rawTools, normalizedTools };
  }

  it('should detect circular dependency between tools', async () => {
    const { inferDependencies } = await import('../../dependencies');

    await setupMockTools();
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

    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(1);
    expect(e107Errors[0]?.message).toContain('tool_a');
    expect(e107Errors[0]?.message).toContain('tool_b');
  });

  it('should pass when no circular dependency exists', async () => {
    const { inferDependencies } = await import('../../dependencies');

    // Setup with different tool structure (tool_a has no inputs)
    await setupMockTools({
      rawTools: [
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
      ],
      normalizedTools: [
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
      ],
    });

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

    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(0);
  });

  it('should detect cycle with confidence exactly 0.8 but ignore 0.6', async () => {
    const { inferDependencies } = await import('../../dependencies');

    await setupMockTools();
    // Create A↔B pair with confidences 0.8 and 0.6
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_b',
        toField: 'input',
        confidence: 0.8, // Above 0.65 - should be detected
      },
      {
        fromTool: 'tool_b',
        fromField: 'output',
        toTool: 'tool_a',
        toField: 'input',
        confidence: 0.6, // Below 0.65 - should be ignored
      },
    ]);

    const result = await analyseTools(mockClient);

    // Should detect 0 cycles (0.6 edge is ignored, so no cycle forms)
    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(0);
  });

  it('should detect longer cycle A→B→C→A', async () => {
    const { inferDependencies } = await import('../../dependencies');

    // Setup with three tools
    await setupMockTools({
      rawTools: [
        {
          name: 'tool_a',
          description: 'Tool A',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
        {
          name: 'tool_b',
          description: 'Tool B',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
        {
          name: 'tool_c',
          description: 'Tool C',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
      ],
      normalizedTools: [
        {
          name: 'tool_a',
          description: 'Tool A',
          inputs: [
            { tool: 'tool_a', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_a', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'a']),
        },
        {
          name: 'tool_b',
          description: 'Tool B',
          inputs: [
            { tool: 'tool_b', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_b', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'b']),
        },
        {
          name: 'tool_c',
          description: 'Tool C',
          inputs: [
            { tool: 'tool_c', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_c', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'c']),
        },
      ],
    });

    // Create cycle A→B→C→A
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_b',
        toField: 'input',
        confidence: 0.9,
      },
      {
        fromTool: 'tool_b',
        fromField: 'output',
        toTool: 'tool_c',
        toField: 'input',
        confidence: 0.9,
      },
      {
        fromTool: 'tool_c',
        fromField: 'output',
        toTool: 'tool_a',
        toField: 'input',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(1);
  });

  it('should detect self-dependency', async () => {
    const { inferDependencies } = await import('../../dependencies');

    await setupMockTools();
    // Create self-dependency: tool_a -> tool_a
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_a',
        toField: 'input',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(1);
  });

  it('should detect multiple independent cycles', async () => {
    const { inferDependencies } = await import('../../dependencies');

    // Setup with four tools: A, B, C, D
    await setupMockTools({
      rawTools: [
        {
          name: 'tool_a',
          description: 'Tool A',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
        {
          name: 'tool_b',
          description: 'Tool B',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
        {
          name: 'tool_c',
          description: 'Tool C',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
        {
          name: 'tool_d',
          description: 'Tool D',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
          outputSchema: {
            type: 'object',
            properties: { output: { type: 'string' } },
          },
        },
      ],
      normalizedTools: [
        {
          name: 'tool_a',
          description: 'Tool A',
          inputs: [
            { tool: 'tool_a', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_a', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'a']),
        },
        {
          name: 'tool_b',
          description: 'Tool B',
          inputs: [
            { tool: 'tool_b', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_b', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'b']),
        },
        {
          name: 'tool_c',
          description: 'Tool C',
          inputs: [
            { tool: 'tool_c', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_c', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'c']),
        },
        {
          name: 'tool_d',
          description: 'Tool D',
          inputs: [
            { tool: 'tool_d', name: 'input', type: 'string', required: true },
          ],
          outputs: [
            { tool: 'tool_d', name: 'output', type: 'string', required: false },
          ],
          descriptionTokens: new Set(['tool', 'd']),
        },
      ],
    });

    // Create two disjoint cycles: A↔B and C↔D
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool_a',
        fromField: 'output',
        toTool: 'tool_b',
        toField: 'input',
        confidence: 0.9,
      },
      {
        fromTool: 'tool_b',
        fromField: 'output',
        toTool: 'tool_a',
        toField: 'input',
        confidence: 0.9,
      },
      {
        fromTool: 'tool_c',
        fromField: 'output',
        toTool: 'tool_d',
        toField: 'input',
        confidence: 0.9,
      },
      {
        fromTool: 'tool_d',
        fromField: 'output',
        toTool: 'tool_c',
        toField: 'input',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    const e107Errors = result.errors.filter(e => e.code === 'E107');
    expect(e107Errors).toHaveLength(2);
  });
});
