/**
 * Tests for W111: Tool Description Quality rule.
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

describe('W111: Tool Description Quality', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when description is too short (<20 chars)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user data', // 13 chars - too short
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
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
        name: 'get_user',
        description: 'Get user data',
        inputs: [
          {
            tool: 'get_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'data']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w111Warnings = result.warnings.filter(w => w.code === 'W111');
    expect(w111Warnings.length).toBeGreaterThan(0);
    expect(w111Warnings[0]?.tool).toBe('get_user');
    expect(w111Warnings[0]?.message).toContain('too short');
  });

  it('should warn when description is too long (>500 chars)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    const longDescription =
      'This is a very long description that goes on and on about how this tool works and what it does and why you might want to use it. ' +
      'It includes extensive details about the implementation, the various parameters, the return values, and all the edge cases. ' +
      'The description continues with even more information about error handling, performance considerations, and best practices for usage. ' +
      'By the time we reach the end, this description should be well over 500 characters in length to trigger the W111 warning for being too long.';

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'process_data',
        description: longDescription,
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
        description: longDescription,
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
        descriptionTokens: new Set(['this', 'is', 'very']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w111Warnings = result.warnings.filter(w => w.code === 'W111');
    expect(w111Warnings.length).toBeGreaterThan(0);
    expect(w111Warnings[0]?.tool).toBe('process_data');
    expect(w111Warnings[0]?.message).toContain('too long');
  });

  it('should pass when description is within acceptable length (20-500 chars)', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description:
          'Retrieves user information by ID including profile details and preferences.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
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
        name: 'get_user',
        description:
          'Retrieves user information by ID including profile details and preferences.',
        inputs: [
          {
            tool: 'get_user',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['retrieves', 'user', 'information']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w111Warnings = result.warnings.filter(w => w.code === 'W111');
    expect(w111Warnings).toHaveLength(0);
  });
});
