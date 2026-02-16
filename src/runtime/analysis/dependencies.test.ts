/**
 * Tests for the dependency inference engine.
 */

import { describe, it, expect } from 'vitest';
import { inferDependencies } from './dependencies';
import type { ToolSpec } from './types';

function makeField(
  name: string,
  toolName: string,
  type = 'string',
  required = false
) {
  return { name, tool: toolName, type, required };
}

describe('inferDependencies', () => {
  it('should not return self-dependencies', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_user',
        description: 'Fetch user data',
        descriptionTokens: new Set(['fetch', 'user', 'data']),
        inputs: [makeField('userId', 'get_user', 'integer', false)],
        outputs: [
          makeField('userId', 'get_user', 'integer', false),
          makeField('name', 'get_user', 'string', false),
        ],
      },
    ];

    const result = inferDependencies(tools);
    expect(result.filter(d => d.fromTool === d.toTool)).toHaveLength(0);
  });

  it('should detect dependencies based on name similarity', () => {
    const tools: ToolSpec[] = [
      {
        name: 'fetch_user',
        description: 'Get user information',
        descriptionTokens: new Set(['fetch', 'user', 'information']),
        inputs: [],
        outputs: [
          makeField('userId', 'fetch_user', 'integer', false),
          makeField('userName', 'fetch_user', 'string', false),
        ],
      },
      {
        name: 'update_user',
        description: 'Update user data',
        descriptionTokens: new Set(['update', 'user', 'data']),
        inputs: [makeField('userId', 'update_user', 'integer', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    const userDeps = result.filter(
      d => d.fromTool === 'fetch_user' && d.toTool === 'update_user'
    );
    expect(userDeps.length).toBeGreaterThan(0);
  });

  it('should detect dependencies based on field name matching', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_user_by_id',
        description: 'Get user by ID',
        descriptionTokens: new Set(['get', 'user']),
        inputs: [],
        outputs: [makeField('user_id', 'get_user_by_id', 'integer', false)],
      },
      {
        name: 'delete_user',
        description: 'Delete a user',
        descriptionTokens: new Set(['delete', 'user']),
        inputs: [makeField('user_id', 'delete_user', 'integer', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    const deps = result.filter(
      d => d.fromTool === 'get_user_by_id' && d.toTool === 'delete_user'
    );
    expect(deps.length).toBeGreaterThan(0);
    expect(deps[0].fromField).toBe('user_id');
    expect(deps[0].toField).toBe('user_id');
  });

  it('should not create dependencies for tools with no outputs', () => {
    const tools: ToolSpec[] = [
      {
        name: 'create_something',
        description: 'Create something',
        descriptionTokens: new Set(['create', 'something']),
        inputs: [],
        outputs: [],
      },
      {
        name: 'read_something',
        description: 'Read something',
        descriptionTokens: new Set(['read', 'something']),
        inputs: [],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    expect(result).toHaveLength(0);
  });

  it('should handle tools with no inputs', () => {
    const tools: ToolSpec[] = [
      {
        name: 'list_users',
        description: 'List all users',
        descriptionTokens: new Set(['list', 'users']),
        inputs: [],
        outputs: [makeField('users', 'list_users', 'array', false)],
      },
    ];

    const result = inferDependencies(tools);
    expect(result).toHaveLength(0);
  });

  it('should handle empty tools array', () => {
    const result = inferDependencies([]);
    expect(result).toHaveLength(0);
  });

  it('should calculate confidence scores', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_user',
        description: 'Get a user',
        descriptionTokens: new Set(['get', 'user']),
        inputs: [],
        outputs: [makeField('id', 'get_user', 'integer', false)],
      },
      {
        name: 'process_user',
        description: 'Process user data',
        descriptionTokens: new Set(['process', 'user', 'data']),
        inputs: [makeField('id', 'process_user', 'integer', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(dep => {
      expect(dep.confidence).toBeGreaterThanOrEqual(0.0);
      expect(dep.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it('should not create dependencies below threshold', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_foo',
        description: 'Get foo',
        descriptionTokens: new Set(['get', 'foo']),
        inputs: [],
        outputs: [makeField('foo_id', 'get_foo', 'string', false)],
      },
      {
        name: 'delete_bar',
        description: 'Delete bar',
        descriptionTokens: new Set(['delete', 'bar']),
        inputs: [makeField('bar_id', 'delete_bar', 'string', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple dependencies between same tools', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_user',
        description: 'Get user',
        descriptionTokens: new Set(['get', 'user']),
        inputs: [],
        outputs: [
          makeField('user_id', 'get_user', 'integer', false),
          makeField('email', 'get_user', 'string', false),
        ],
      },
      {
        name: 'send_email',
        description: 'Send email to user',
        descriptionTokens: new Set(['send', 'email', 'user']),
        inputs: [makeField('email', 'send_email', 'string', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    const emailDep = result.find(
      d => d.fromTool === 'get_user' && d.toTool === 'send_email'
    );
    expect(emailDep).toBeDefined();
    expect(emailDep?.fromField).toBe('email');
  });

  it('should detect exact field matches with high confidence', () => {
    const tools: ToolSpec[] = [
      {
        name: 'get_user',
        description: 'Get user by ID',
        descriptionTokens: new Set(['get', 'user', 'by']),
        inputs: [],
        outputs: [makeField('id', 'get_user', 'integer', false)],
      },
      {
        name: 'get_user_details',
        description: 'Get user details by ID',
        descriptionTokens: new Set(['get', 'user', 'details', 'by']),
        inputs: [makeField('id', 'get_user_details', 'integer', true)],
        outputs: [],
      },
    ];

    const result = inferDependencies(tools);
    expect(result.length).toBeGreaterThan(0);
  });
});
