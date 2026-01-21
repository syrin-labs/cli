/**
 * Tests for E110: Tool Ambiguity rule.
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

describe('E110: Tool Ambiguity', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect ambiguous tools with similar descriptions', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
      {
        name: 'get_user_data',
        description: 'Get user information', // Same description
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user',
        description: 'Get user information',
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
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
      {
        name: 'get_user_data',
        description: 'Get user information',
        inputs: [
          {
            tool: 'get_user_data',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_data',
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e110Errors = result.errors.filter(e => e.code === 'E110');
    expect(e110Errors.length).toBeGreaterThan(0);
  });

  it('should pass when tools have distinct descriptions', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
      {
        name: 'get_user_profile',
        description: 'Get detailed user profile with preferences', // Different description
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            profile: { type: 'object' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_user',
        description: 'Get user information',
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
            name: 'name',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
      {
        name: 'get_user_profile',
        description: 'Get detailed user profile with preferences',
        inputs: [
          {
            tool: 'get_user_profile',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_user_profile',
            name: 'profile',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'get',
          'detailed',
          'user',
          'profile',
          'preferences',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e110Errors = result.errors.filter(e => e.code === 'E110');
    expect(e110Errors).toHaveLength(0);
  });
});
