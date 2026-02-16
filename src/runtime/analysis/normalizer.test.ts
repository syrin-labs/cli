/**
 * Tests for the schema normalizer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeTool, normalizeTools } from './normalizer';
import type { RawTool } from './types';

// Mock $RefParser
vi.mock('@apidevtools/json-schema-ref-parser', () => ({
  default: {
    dereference: vi.fn(schema => Promise.resolve(schema)),
  },
}));

describe('normalizeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle primitive types', async () => {
    const rawTool: RawTool = {
      name: 'test_primitive',
      description: 'Test tool with primitive types',
      inputSchema: {
        type: 'object',
        properties: {
          stringField: { type: 'string', description: 'A string field' },
          numberField: { type: 'number', description: 'A number field' },
          booleanField: { type: 'boolean', description: 'A boolean field' },
          integerField: { type: 'integer', description: 'An integer field' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'string' },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_primitive');
    expect(result.description).toBe('Test tool with primitive types');
    expect(result.inputs).toHaveLength(4);
    expect(result.outputs).toHaveLength(1);
  });

  it('should handle nested object schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_nested',
      description: 'Test tool with nested objects',
      inputSchema: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_nested');
    // Should have nested fields flattened
    expect(result.inputs.length).toBeGreaterThan(0);
  });

  it('should handle array schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_array',
      description: 'Test tool with arrays',
      inputSchema: {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tags',
          },
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            description: 'List of users',
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_array');
    expect(result.inputs.length).toBeGreaterThan(0);
  });

  it('should handle oneOf schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_oneof',
      description: 'Test tool with oneOf',
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            oneOf: [
              { type: 'string', description: 'String option' },
              { type: 'number', description: 'Number option' },
            ],
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_oneof');
    // Should extract fields from all oneOf variants
    expect(result.inputs.length).toBeGreaterThan(0);
  });

  it('should handle anyOf schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_anyof',
      description: 'Test tool with anyOf',
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_anyof');
    expect(result.inputs.length).toBeGreaterThan(0);
  });

  it('should handle allOf schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_allof',
      description: 'Test tool with allOf',
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            allOf: [
              { type: 'string', description: 'Base field' },
              { description: 'Additional field' },
            ],
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_allof');
    expect(result.inputs.length).toBeGreaterThan(0);
  });

  it('should handle format fields', async () => {
    const rawTool: RawTool = {
      name: 'test_format',
      description: 'Test tool with format',
      inputSchema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
          },
          uri: { type: 'string', format: 'uri', description: 'URI' },
          dateTime: {
            type: 'string',
            format: 'date-time',
            description: 'Date time',
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_format');
    expect(result.inputs.length).toBe(3);
  });

  it('should handle enum fields', async () => {
    const rawTool: RawTool = {
      name: 'test_enum',
      description: 'Test tool with enums',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'active', 'completed'],
            description: 'Status',
          },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_enum');
    expect(result.inputs.length).toBe(1);
    expect(result.inputs[0]?.enum).toEqual(['pending', 'active', 'completed']);
  });

  it('should handle required fields', async () => {
    const rawTool: RawTool = {
      name: 'test_required',
      description: 'Test tool with required fields',
      inputSchema: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', description: 'User ID' },
          name: { type: 'string', description: 'User name' },
          email: { type: 'string', description: 'User email' },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_required');
    const idField = result.inputs.find(f => f.name === 'id');
    const emailField = result.inputs.find(f => f.name === 'email');
    expect(idField?.required).toBe(true);
    expect(emailField?.required).toBe(false);
  });

  it('should handle missing/empty schemas', async () => {
    const rawTool: RawTool = {
      name: 'test_empty',
      description: 'Test tool with empty schemas',
      inputSchema: {},
      outputSchema: undefined,
    };

    const result = await normalizeTool(rawTool);

    expect(result.name).toBe('test_empty');
    expect(result.inputs).toHaveLength(0);
    expect(result.outputs).toHaveLength(0);
  });

  it('should extract description tokens', async () => {
    const rawTool: RawTool = {
      name: 'test tool',
      description: 'Retrieve user information from database',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'integer' },
        },
      },
    };

    const result = await normalizeTool(rawTool);

    expect(result.descriptionTokens.size).toBeGreaterThan(0);
    // These should all be in the tokens (length > 2)
    expect(result.descriptionTokens.has('retrieve')).toBe(true);
    expect(result.descriptionTokens.has('information')).toBe(true);
    expect(result.descriptionTokens.has('database')).toBe(true);
  });

  it('should filter short tokens', async () => {
    const rawTool: RawTool = {
      name: 'a b c test',
      description: 'ab cd',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const result = await normalizeTool(rawTool);

    // Short tokens (length <= 2) should be filtered out
    expect(result.descriptionTokens.has('a')).toBe(false);
    expect(result.descriptionTokens.has('b')).toBe(false);
    expect(result.descriptionTokens.has('c')).toBe(false);
    expect(result.descriptionTokens.has('ab')).toBe(false);
  });
});

describe('normalizeTools', () => {
  it('should normalize multiple tools', async () => {
    const rawTools: RawTool[] = [
      {
        name: 'tool1',
        description: 'First tool',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'integer' } },
        },
      },
      {
        name: 'tool2',
        description: 'Second tool',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      },
      {
        name: 'tool3',
        description: 'Third tool',
        inputSchema: undefined,
      },
    ];

    const result = await normalizeTools(rawTools);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('tool1');
    expect(result[1].name).toBe('tool2');
    expect(result[2].name).toBe('tool3');
    expect(result[2].inputs).toHaveLength(0);
  });

  it('should handle empty array', async () => {
    const result = await normalizeTools([]);
    expect(result).toHaveLength(0);
  });
});
