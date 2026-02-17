/**
 * Tests for W116: Schema-Description Drift rule.
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

describe('W116: Schema-Description Drift', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when many parameters are not mentioned in description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Creates a new user account', // Doesn't mention username, email, password
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['username', 'email', 'password'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'create_user',
        description: 'Creates a new user account',
        inputs: [
          {
            tool: 'create_user',
            name: 'username',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'email',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'password',
            type: 'string',
            required: true,
          },
          { tool: 'create_user', name: 'age', type: 'number', required: false },
        ],
        outputs: [
          {
            tool: 'create_user',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['creates', 'new', 'user', 'account']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w116Warnings = result.warnings.filter(w => w.code === 'W116');
    expect(w116Warnings.length).toBeGreaterThan(0);
    expect(w116Warnings[0]?.tool).toBe('create_user');
    expect(w116Warnings[0]?.message).toContain('parameters not mentioned');
  });

  it('should pass when parameters are mentioned in description', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Creates a new user with username, email, and password',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
          },
          required: ['username', 'email', 'password'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'create_user',
        description: 'Creates a new user with username, email, and password',
        inputs: [
          {
            tool: 'create_user',
            name: 'username',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'email',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'password',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'create_user',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'creates',
          'new',
          'user',
          'with',
          'username',
          'email',
          'and',
          'password',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w116Warnings = result.warnings.filter(w => w.code === 'W116');
    expect(w116Warnings).toHaveLength(0);
  });

  it('should not warn when only a few parameters are unmentioned', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description:
          'Creates a new user with username and email returning userId', // Only missing password (1 out of 4)
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
          },
          required: ['username', 'email', 'password'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'create_user',
        description:
          'Creates a new user with username and email returning userId',
        inputs: [
          {
            tool: 'create_user',
            name: 'username',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'email',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'password',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'create_user',
            name: 'userId',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set([
          'creates',
          'new',
          'user',
          'with',
          'username',
          'and',
          'email',
          'returning',
          'userId',
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w116Warnings = result.warnings.filter(w => w.code === 'W116');
    expect(w116Warnings).toHaveLength(0);
  });
});
