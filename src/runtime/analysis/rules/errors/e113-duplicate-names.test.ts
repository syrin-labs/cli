/**
 * Tests for E113: Duplicate Tool Names rule.
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

describe('E113: Duplicate Tool Names', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect duplicate tool names', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'getUser',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            user: { type: 'object' },
          },
        },
      },
      {
        name: 'getUser', // Duplicate
        description: 'Get user data',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'getUser',
        description: 'Get user information',
        inputs: [
          {
            tool: 'getUser',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'getUser',
            name: 'user',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
      {
        name: 'getUser',
        description: 'Get user data',
        inputs: [
          {
            tool: 'getUser',
            name: 'id',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'getUser',
            name: 'data',
            type: 'object',
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

    const e113Errors = result.errors.filter(e => e.code === 'E113');
    expect(e113Errors.length).toBeGreaterThan(0);
    expect(e113Errors[0]?.message).toContain('Duplicate tool names');
    expect(e113Errors[0]?.message).toContain('getUser');
  });

  it('should detect case-insensitive duplicates', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'GetUser',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            user: { type: 'object' },
          },
        },
      },
      {
        name: 'getuser', // Same name, different case
        description: 'Get user data',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object' },
          },
        },
      },
      {
        name: 'GETUSER', // Same name, uppercase
        description: 'Get user profile',
        inputSchema: {
          type: 'object',
          properties: {
            profileId: { type: 'string' },
          },
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
        name: 'GetUser',
        description: 'Get user information',
        inputs: [
          {
            tool: 'GetUser',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'GetUser',
            name: 'user',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
      {
        name: 'getuser',
        description: 'Get user data',
        inputs: [
          {
            tool: 'getuser',
            name: 'id',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'getuser',
            name: 'data',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'data']),
      },
      {
        name: 'GETUSER',
        description: 'Get user profile',
        inputs: [
          {
            tool: 'GETUSER',
            name: 'profileId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'GETUSER',
            name: 'profile',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'profile']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e113Errors = result.errors.filter(e => e.code === 'E113');
    expect(e113Errors.length).toBeGreaterThan(0);
    // Should detect all three variants as duplicates
    expect(e113Errors[0]?.message).toContain('GetUser');
    expect(e113Errors[0]?.message).toContain('getuser');
    expect(e113Errors[0]?.message).toContain('GETUSER');
  });

  it('should pass when all tool names are unique', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'getUser',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            user: { type: 'object' },
          },
        },
      },
      {
        name: 'createUser',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
      {
        name: 'deleteUser',
        description: 'Delete a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'getUser',
        description: 'Get user information',
        inputs: [
          {
            tool: 'getUser',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'getUser',
            name: 'user',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
      },
      {
        name: 'createUser',
        description: 'Create a new user',
        inputs: [
          {
            tool: 'createUser',
            name: 'name',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'createUser',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['create', 'new', 'user']),
      },
      {
        name: 'deleteUser',
        description: 'Delete a user',
        inputs: [
          {
            tool: 'deleteUser',
            name: 'userId',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'deleteUser',
            name: 'success',
            type: 'boolean',
            required: false,
          },
        ],
        descriptionTokens: new Set(['delete', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e113Errors = result.errors.filter(e => e.code === 'E113');
    expect(e113Errors).toHaveLength(0);
  });
});
