/**
 * Integration tests for embedding-based semantic detection.
 * These tests verify that the embedding-based approach actually works
 * for detecting user data, sensitive data, mutations, etc.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeTool } from './normalizer';
import {
  initializeConceptEmbeddings,
  isConceptMatch,
} from './semantic-embedding';
import { E108ImplicitUserInput } from './rules/errors/e108-implicit-user-input';
import { E112SensitiveParams } from './rules/errors/e112-sensitive-params';
import { E100MissingOutputSchema } from './rules/errors/e100-missing-output-schema';
import { W117IdempotencySignal } from './rules/warnings/w117-idempotency-signal';
import type { AnalysisContext } from './types';

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

describe('Embedding-based Semantic Detection', () => {
  beforeEach(async () => {
    await initializeConceptEmbeddings();
  });

  describe('isConceptMatch', () => {
    it('should detect user data concepts in field embeddings', async () => {
      const userQueryTool = await normalizeTool({
        name: 'process_user_query',
        description: 'Process user query from input',
        inputSchema: {
          type: 'object',
          properties: {
            userQuery: { type: 'string', description: 'User query string' },
          },
          required: ['userQuery'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      });

      const userQueryEmbedding =
        userQueryTool.inputEmbeddings?.get('userQuery');
      expect(userQueryEmbedding).toBeDefined();
      expect(userQueryEmbedding?.length).toBeGreaterThan(0);

      const isUserData = isConceptMatch(userQueryEmbedding, 'USER_DATA', 0.35);
      expect(isUserData).toBe(true);
    });

    it('should detect sensitive data concepts in field embeddings', async () => {
      const sensitiveTool = await normalizeTool({
        name: 'authenticate_user',
        description: 'Authenticate user with credentials',
        inputSchema: {
          type: 'object',
          properties: {
            password: { type: 'string', description: 'User password' },
            apiKey: {
              type: 'string',
              description: 'API key for authentication',
            },
          },
          required: ['password'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      });

      const passwordEmbedding = sensitiveTool.inputEmbeddings?.get('password');
      const apiKeyEmbedding = sensitiveTool.inputEmbeddings?.get('apiKey');

      expect(passwordEmbedding).toBeDefined();
      expect(isConceptMatch(passwordEmbedding, 'SENSITIVE', 0.45)).toBe(true);

      expect(apiKeyEmbedding).toBeDefined();
      expect(isConceptMatch(apiKeyEmbedding, 'SENSITIVE', 0.45)).toBe(true);
    });

    it('should detect mutation concepts in tool descriptions', async () => {
      const createTool = await normalizeTool({
        name: 'create_user',
        description: 'Create a new user in the system',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      });

      expect(createTool.descriptionEmbedding).toBeDefined();
      const isMutation = isConceptMatch(
        createTool.descriptionEmbedding,
        'MUTATION',
        0.45
      );
      expect(isMutation).toBe(true);
    });

    it('should detect returns data concepts in tool descriptions', async () => {
      const fetchTool = await normalizeTool({
        name: 'get_user_data',
        description: 'Fetch user data from database',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            userData: { type: 'object' },
          },
        },
      });

      expect(fetchTool.descriptionEmbedding).toBeDefined();
      const isReturnsData = isConceptMatch(
        fetchTool.descriptionEmbedding,
        'RETURNS_DATA',
        0.45
      );
      expect(isReturnsData).toBe(true);
    });

    it('should detect idempotency concepts in tool descriptions', async () => {
      const idempotentTool = await normalizeTool({
        name: 'update_user',
        description:
          'Update user information. This operation is idempotent and safe to retry.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            data: { type: 'object' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      });

      expect(idempotentTool.descriptionEmbedding).toBeDefined();
      const isIdempotent = isConceptMatch(
        idempotentTool.descriptionEmbedding,
        'IDEMPOTENT',
        0.4
      );
      expect(isIdempotent).toBe(true);
    });
  });

  describe('E108: Implicit User Input Rule', () => {
    it('should detect user data field with no explicit source using embeddings', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'process_user_query',
          description: 'Process user query',
          inputSchema: {
            type: 'object',
            properties: {
              userQuery: { type: 'string' },
            },
            required: ['userQuery'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              result: { type: 'string' },
            },
          },
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = E108ImplicitUserInput.check(ctx);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.field).toBe('userQuery');
    });

    it('should NOT flag non-user-data fields', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'calculate_sum',
          description: 'Calculate sum of numbers',
          inputSchema: {
            type: 'object',
            properties: {
              numbers: { type: 'array', items: { type: 'number' } },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              sum: { type: 'number' },
            },
          },
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = E108ImplicitUserInput.check(ctx);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('E112: Sensitive Params Rule', () => {
    it('should detect sensitive fields using embeddings', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'authenticate',
          description: 'Authenticate user',
          inputSchema: {
            type: 'object',
            properties: {
              password: { type: 'string' },
              apiKey: { type: 'string' },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
            },
          },
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = E112SensitiveParams.check(ctx);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should NOT flag non-sensitive fields', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'get_items',
          description: 'Get items from list',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              offset: { type: 'number' },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              items: { type: 'array' },
            },
          },
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = E112SensitiveParams.check(ctx);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('E100: Missing Output Schema Rule', () => {
    it('should detect tools that return data but have no output schema', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'fetch_user',
          description: 'Fetch user from database',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
          },
          outputSchema: undefined,
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = E100MissingOutputSchema.check(ctx);
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('W117: Idempotency Signal Rule', () => {
    it('should detect mutation tools lacking idempotency signal', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'create_user',
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
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = W117IdempotencySignal.check(ctx);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should NOT flag mutation tools with idempotency signal', async () => {
      const tools = await Promise.all([
        normalizeTool({
          name: 'update_user',
          description:
            'Update user. This operation is idempotent and safe to retry.',
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
        }),
      ]);

      const ctx: AnalysisContext = {
        tools,
        dependencies: [],
        indexes: {
          toolIndex: new Map(),
          inputIndex: new Map(),
          outputIndex: new Map(),
          keywordIndex: new Map(),
        },
      };

      const diagnostics = W117IdempotencySignal.check(ctx);
      expect(diagnostics.length).toBe(0);
    });
  });
});
