/**
 * Tests for W113: Optional Parameter Example rule.
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

describe('W113: Optional Parameter Example', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when optional parameter lacks example value', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            role: {
              type: 'string',
              description: 'User role (optional)',
              // No example and not in required
            },
          },
          required: ['name', 'email'], // role is optional
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
        description: 'Create a new user',
        inputs: [
          {
            tool: 'create_user',
            name: 'name',
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
            name: 'role',
            type: 'string',
            required: false, // Optional
            description: 'User role (optional)',
            // No example
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
        descriptionTokens: new Set(['create', 'new', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w113Warnings = result.warnings.filter(w => w.code === 'W113');
    expect(w113Warnings.length).toBeGreaterThan(0);
    expect(w113Warnings[0]?.tool).toBe('create_user');
    expect(w113Warnings[0]?.field).toBe('role');
    expect(w113Warnings[0]?.message).toContain('lacks example value');
  });

  it('should pass when optional parameter has example value', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            role: {
              type: 'string',
              description: 'User role',
              examples: ['admin', 'user', 'guest'],
            },
          },
          required: ['name', 'email'],
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
        description: 'Create a new user',
        inputs: [
          {
            tool: 'create_user',
            name: 'name',
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
            name: 'role',
            type: 'string',
            required: false,
            description: 'User role',
            example: 'admin', // Has example
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
        descriptionTokens: new Set(['create', 'new', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w113Warnings = result.warnings.filter(w => w.code === 'W113');
    expect(w113Warnings).toHaveLength(0);
  });

  it('should pass when optional parameter has enum values', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'create_user',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'guest'], // Enum defines possible values
              description: 'User role',
            },
          },
          required: ['name'],
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
        description: 'Create a new user',
        inputs: [
          {
            tool: 'create_user',
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            tool: 'create_user',
            name: 'role',
            type: 'string',
            required: false,
            description: 'User role',
            enum: ['admin', 'user', 'guest'], // Has enum - should not warn
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
        descriptionTokens: new Set(['create', 'new', 'user']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w113Warnings = result.warnings.filter(w => w.code === 'W113');
    expect(w113Warnings).toHaveLength(0);
  });
});
