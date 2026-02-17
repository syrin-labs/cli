/**
 * Tests for E112: Security - Sensitive Parameter Detection rule.
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
  isConceptMatch: vi.fn(),
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

describe('E112: Security - Sensitive Parameter Detection', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should detect sensitive parameters like password', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'authenticate_user',
        description: 'Authenticate user with credentials',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['username', 'password'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
    ]);

    // Mock isConceptMatch to return true only for sensitive parameters
    vi.mocked(isConceptMatch).mockImplementation(
      (embedding, category, _threshold) => {
        // Only return true for SENSITIVE category AND when embedding matches password
        if (category !== 'SENSITIVE') return false;
        // password embedding is [0.4, 0.5, 0.6]
        return (
          embedding?.length === 3 &&
          embedding[0] === 0.4 &&
          embedding[1] === 0.5 &&
          embedding[2] === 0.6
        );
      }
    );

    const normalizedTools = [
      {
        name: 'authenticate_user',
        description: 'Authenticate user with credentials',
        inputs: [
          {
            tool: 'authenticate_user',
            name: 'username',
            type: 'string',
            required: true,
          },
          {
            tool: 'authenticate_user',
            name: 'password',
            type: 'string',
            required: true,
            description: 'User password',
          },
        ],
        outputs: [
          {
            tool: 'authenticate_user',
            name: 'token',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['authenticate', 'user', 'credentials']),
        inputEmbeddings: new Map([
          ['username', [0.1, 0.2, 0.3]],
          ['password', [0.4, 0.5, 0.6]],
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e112Errors = result.errors.filter(e => e.code === 'E112');
    expect(e112Errors.length).toBeGreaterThan(0);
    expect(e112Errors[0]?.tool).toBe('authenticate_user');
    expect(e112Errors[0]?.field).toBe('password');
    expect(e112Errors[0]?.message).toContain('Security risk');
    expect(e112Errors[0]?.message).toContain('sensitive data');
  });

  it('should detect sensitive parameters like apiKey', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'call_external_api',
        description: 'Call external API with authentication',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            apiKey: {
              type: 'string',
              description: 'API key for authentication',
            },
          },
          required: ['endpoint', 'apiKey'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    ]);

    // Mock isConceptMatch to return true only for sensitive parameters
    vi.mocked(isConceptMatch).mockImplementation(
      (embedding, category, _threshold) => {
        // Only return true for SENSITIVE category AND when embedding matches apiKey
        if (category !== 'SENSITIVE') return false;
        // apiKey embedding is [0.4, 0.5, 0.6]
        return (
          embedding?.length === 3 &&
          embedding[0] === 0.4 &&
          embedding[1] === 0.5 &&
          embedding[2] === 0.6
        );
      }
    );

    const normalizedTools = [
      {
        name: 'call_external_api',
        description: 'Call external API with authentication',
        inputs: [
          {
            tool: 'call_external_api',
            name: 'endpoint',
            type: 'string',
            required: true,
          },
          {
            tool: 'call_external_api',
            name: 'apiKey',
            type: 'string',
            required: true,
            description: 'API key for authentication',
          },
        ],
        outputs: [
          {
            tool: 'call_external_api',
            name: 'result',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['call', 'external', 'api']),
        inputEmbeddings: new Map([
          ['endpoint', [0.1, 0.2, 0.3]],
          ['apiKey', [0.4, 0.5, 0.6]],
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e112Errors = result.errors.filter(e => e.code === 'E112');
    expect(e112Errors.length).toBeGreaterThan(0);
    expect(e112Errors[0]?.field).toBe('apiKey');
  });

  it('should pass when parameters are not sensitive', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');
    const { isConceptMatch } = await import('../../semantic-embedding');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            includeDetails: { type: 'boolean', description: 'Include details' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            user: { type: 'object' },
          },
        },
      },
    ]);

    // Mock isConceptMatch to return false (not sensitive)
    vi.mocked(isConceptMatch).mockReturnValue(false);

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
            description: 'User ID',
          },
          {
            tool: 'get_user',
            name: 'includeDetails',
            type: 'boolean',
            required: false,
            description: 'Include details',
          },
        ],
        outputs: [
          {
            tool: 'get_user',
            name: 'user',
            type: 'object',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'user', 'information']),
        inputEmbeddings: new Map([
          ['userId', [0.1, 0.2, 0.3]],
          ['includeDetails', [0.4, 0.5, 0.6]],
        ]),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const e112Errors = result.errors.filter(e => e.code === 'E112');
    expect(e112Errors).toHaveLength(0);
  });
});
