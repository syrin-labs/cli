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
  logger: {
    error: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
    blank: vi.fn(),
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

    // Test CI mode
    displayAnalysisResult(result, { ci: true });

    expect(displayAnalysisResult).toHaveBeenCalledWith(result, { ci: true });
  });

  it('should handle JSON mode output', async () => {
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

    // Test JSON mode
    displayAnalysisResult(result, { json: true });

    expect(displayAnalysisResult).toHaveBeenCalledWith(result, { json: true });
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
