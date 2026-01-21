/**
 * Tests for W107: Multiple Entry Points rule.
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

describe('W107: Multiple Entry Points', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
  });

  it('should warn when multiple tools have same entry point field', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_weather',
        description: 'Get weather by location',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            temperature: { type: 'number' },
          },
        },
      },
      {
        name: 'get_forecast',
        description: 'Get forecast by location',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            forecast: { type: 'string' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_weather',
        description: 'Get weather by location',
        inputs: [
          {
            tool: 'get_weather',
            name: 'location',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_weather',
            name: 'temperature',
            type: 'number',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'weather', 'by', 'location']),
      },
      {
        name: 'get_forecast',
        description: 'Get forecast by location',
        inputs: [
          {
            tool: 'get_forecast',
            name: 'location',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_forecast',
            name: 'forecast',
            type: 'string',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'forecast', 'by', 'location']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w107Warnings = result.warnings.filter(w => w.code === 'W107');
    expect(w107Warnings.length).toBeGreaterThan(0);
  });

  it('should pass when tools have distinct entry points', async () => {
    const { loadMCPTools } = await import('../../loader');
    const { normalizeTools } = await import('../../normalizer');
    const { buildIndexes } = await import('../../indexer');
    const { inferDependencies } = await import('../../dependencies');

    vi.mocked(loadMCPTools).mockResolvedValue([
      {
        name: 'get_weather_by_city',
        description: 'Get weather by city',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string' },
          },
          required: ['city'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            temperature: { type: 'number' },
          },
        },
      },
      {
        name: 'get_weather_by_zipCode',
        description: 'Get weather by zip code',
        inputSchema: {
          type: 'object',
          properties: {
            zipCode: { type: 'string' },
          },
          required: ['zipCode'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            temperature: { type: 'number' },
          },
        },
      },
    ]);

    const normalizedTools = [
      {
        name: 'get_weather_by_city',
        description: 'Get weather by city',
        inputs: [
          {
            tool: 'get_weather_by_city',
            name: 'city',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_weather_by_city',
            name: 'temperature',
            type: 'number',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'weather', 'by', 'city']),
      },
      {
        name: 'get_weather_by_zipCode',
        description: 'Get weather by zip code',
        inputs: [
          {
            tool: 'get_weather_by_zipCode',
            name: 'zipCode',
            type: 'string',
            required: true,
          },
        ],
        outputs: [
          {
            tool: 'get_weather_by_zipCode',
            name: 'temperature',
            type: 'number',
            required: false,
          },
        ],
        descriptionTokens: new Set(['get', 'weather', 'by', 'zip', 'code']),
      },
    ];

    vi.mocked(normalizeTools).mockResolvedValue(normalizedTools);
    vi.mocked(buildIndexes).mockReturnValue(
      buildIndexesFromTools(normalizedTools)
    );
    vi.mocked(inferDependencies).mockReturnValue([]);

    const result = await analyseTools(mockClient);

    const w107Warnings = result.warnings.filter(w => w.code === 'W107');
    expect(w107Warnings).toHaveLength(0);
  });
});
