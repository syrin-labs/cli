/**
 * Tests for analysis engine - output formats.
 * Individual rule tests are in their respective rule files.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyseTools } from './analyser';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { buildIndexesFromTools } from './rules/__test-helpers__';

// Mock dependencies
vi.mock('./loader');
vi.mock('./normalizer');
vi.mock('./indexer');
vi.mock('./dependencies');
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
vi.mock('@/presentation/analysis-ui', () => ({
  displayAnalysisResult: vi.fn(),
}));

describe('Analysis Engine - Output Formats', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should handle CI mode output', async () => {
    const { loadMCPTools } = await import('./loader');
    const { normalizeTools } = await import('./normalizer');
    const { buildIndexes } = await import('./indexer');
    const { inferDependencies } = await import('./dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
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
        name: 'test_tool',
        description: 'Test tool',
        inputs: [],
        outputs: [
          {
            tool: 'test_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['test', 'tool']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    // Verify the result structure contains expected fields
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('dependencies');
    expect(result).toHaveProperty('toolCount');
    expect(result.toolCount).toBe(1);
  });

  it('should handle JSON mode output', async () => {
    const { loadMCPTools } = await import('./loader');
    const { normalizeTools } = await import('./normalizer');
    const { buildIndexes } = await import('./indexer');
    const { inferDependencies } = await import('./dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
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
        name: 'test_tool',
        description: 'Test tool',
        inputs: [],
        outputs: [
          {
            tool: 'test_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['test', 'tool']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    // Verify the result structure contains expected fields
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('dependencies');
    expect(result).toHaveProperty('toolCount');
    expect(result.toolCount).toBe(1);
  });

  it('should handle graph mode output', async () => {
    const { loadMCPTools } = await import('./loader');
    const { normalizeTools } = await import('./normalizer');
    const { buildIndexes } = await import('./indexer');
    const { inferDependencies } = await import('./dependencies');
    const { displayAnalysisResult } =
      await import('@/presentation/analysis-ui');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' },
          },
        },
      },
      {
        name: 'tool2',
        description: 'Tool 2',
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
        name: 'tool1',
        description: 'Tool 1',
        inputs: [],
        outputs: [
          {
            tool: 'tool1',
            name: 'output',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', '1']),
      },
      {
        name: 'tool2',
        description: 'Tool 2',
        inputs: [
          {
            tool: 'tool2',
            name: 'input',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'tool2',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['tool', '2']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([
      {
        fromTool: 'tool1',
        fromField: 'output',
        toTool: 'tool2',
        toField: 'input',
        confidence: 0.9,
      },
    ]);

    const result = await analyseTools(mockClient);

    // Test graph mode
    displayAnalysisResult(result, { graph: true });

    expect(displayAnalysisResult).toHaveBeenCalledWith(result, { graph: true });
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it('should handle combined output options', async () => {
    const { loadMCPTools } = await import('./loader');
    const { normalizeTools } = await import('./normalizer');
    const { buildIndexes } = await import('./indexer');
    const { inferDependencies } = await import('./dependencies');
    const { displayAnalysisResult } =
      await import('@/presentation/analysis-ui');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
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
        name: 'test_tool',
        description: 'Test tool',
        inputs: [],
        outputs: [
          {
            tool: 'test_tool',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['test', 'tool']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    // Test combined options
    displayAnalysisResult(result, { ci: true, json: true, graph: true });

    expect(displayAnalysisResult).toHaveBeenCalledWith(result, {
      ci: true,
      json: true,
      graph: true,
    });
  });
});
