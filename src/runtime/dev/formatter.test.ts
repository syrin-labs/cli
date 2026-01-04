/**
 * Tests for DevFormatter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevFormatter } from './formatter';
import type { DevSessionState } from './types';
import type { ToolCall } from '@/runtime/llm/types';

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: {
    blank: vi.fn(),
    success: vi.fn(),
    plain: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('DevFormatter', () => {
  let formatter: DevFormatter;

  beforeEach(() => {
    vi.clearAllMocks();
    formatter = new DevFormatter();
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const defaultFormatter = new DevFormatter();
      expect(defaultFormatter).toBeDefined();
    });

    it('should accept custom options', () => {
      const customFormatter = new DevFormatter({
        useColors: false,
        truncateLongOutputs: false,
        maxOutputLength: 1000,
      });
      expect(customFormatter).toBeDefined();
    });
  });

  describe('displayHeader', () => {
    it('should display header with all information', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayHeader(
        '1.0.0',
        'http',
        'http://localhost:8000',
        undefined,
        'claude',
        5
      );

      expect(log.blank).toHaveBeenCalled();
      expect(log.success).toHaveBeenCalled();
      expect(log.plain).toHaveBeenCalled();
    });

    it('should display HTTP transport with URL', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayHeader(
        '1.0.0',
        'http',
        'http://localhost:8000',
        undefined,
        'claude',
        3
      );

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8000')
      );
    });

    it('should display stdio transport with command', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayHeader(
        '1.0.0',
        'stdio',
        undefined,
        'python server.py',
        'claude',
        3
      );

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('python server.py')
      );
    });
  });

  describe('displayUserInput', () => {
    it('should display user input', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayUserInput('Hello, world!');

      expect(log.blank).toHaveBeenCalled();
      expect(log.success).toHaveBeenCalledWith(
        expect.stringContaining('Hello, world!')
      );
    });
  });

  describe('displayToolDetection', () => {
    it('should display detected tool calls', async () => {
      const { log } = await import('@/utils/logger');
      const toolCalls: ToolCall[] = [
        {
          name: 'get_user',
          arguments: { userId: '123' },
        },
      ];

      formatter.displayToolDetection(toolCalls);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('get_user')
      );
    });

    it('should not display anything for empty tool calls', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolDetection([]);

      expect(log.plain).not.toHaveBeenCalled();
    });
  });

  describe('displayToolExecutionStart', () => {
    it('should display tool execution start', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolExecutionStart('get_user');

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('get_user')
      );
    });
  });

  describe('displayToolExecutionEnd', () => {
    it('should display tool execution end with duration', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolExecutionEnd('get_user', 150);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('150ms')
      );
    });
  });

  describe('displayToolResult', () => {
    it('should display string result', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolResult('get_user', 'Success');

      expect(log.plain).toHaveBeenCalledWith(expect.stringContaining('Success'));
    });

    it('should display object result as JSON', async () => {
      const { log } = await import('@/utils/logger');
      const result = { name: 'John', age: 30 };

      formatter.displayToolResult('get_user', result);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('John')
      );
    });

    it('should truncate long results when truncateLongOutputs is true', async () => {
      const { log } = await import('@/utils/logger');
      const longResult = 'x'.repeat(1000);

      formatter.displayToolResult('get_user', longResult);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('... (truncated)')
      );
    });

    it('should not truncate when truncateLongOutputs is false', async () => {
      const { log } = await import('@/utils/logger');
      const noTruncateFormatter = new DevFormatter({
        truncateLongOutputs: false,
      });
      const longResult = 'x'.repeat(1000);

      noTruncateFormatter.displayToolResult('get_user', longResult);

      expect(log.plain).toHaveBeenCalledWith(longResult);
    });
  });

  describe('displayToolError', () => {
    it('should display tool error', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolError('get_user', 'Connection failed');

      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool Execution Error')
      );
      expect(log.plain).toHaveBeenCalledWith('Connection failed');
    });
  });

  describe('displayLLMResponse', () => {
    it('should display LLM response', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayLLMResponse('claude', 'This is a response');

      expect(log.success).toHaveBeenCalled();
      expect(log.plain).toHaveBeenCalledWith('This is a response');
    });

    it('should split multi-line responses', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayLLMResponse('claude', 'Line 1\nLine 2\nLine 3');

      expect(log.plain).toHaveBeenCalledTimes(3);
    });
  });

  describe('displaySessionSummary', () => {
    it('should display session summary with all metrics', async () => {
      const { log } = await import('@/utils/logger');
      const state: DevSessionState = {
        conversationHistory: [],
        toolCalls: [],
        totalToolCalls: 5,
        totalLLMCalls: 3,
        startTime: new Date(Date.now() - 5000), // 5 seconds ago
      };

      formatter.displaySessionSummary(state);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('5')
      ); // totalToolCalls
      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('3')
      ); // totalLLMCalls
    });
  });

  describe('displayToolsList', () => {
    it('should display list of tools', async () => {
      const { log } = await import('@/utils/logger');
      const tools = [
        { name: 'tool1', description: 'Tool 1 description' },
        { name: 'tool2', description: 'Tool 2 description' },
      ];

      formatter.displayToolsList(tools);

      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('tool1')
      );
      expect(log.plain).toHaveBeenCalledWith(
        expect.stringContaining('Tool 1 description')
      );
    });

    it('should display warning when no tools available', async () => {
      const { log } = await import('@/utils/logger');

      formatter.displayToolsList([]);

      expect(log.warning).toHaveBeenCalledWith(
        expect.stringContaining('No tools available')
      );
    });
  });

  describe('formatJSON', () => {
    it('should format object as JSON', () => {
      const obj = { key: 'value', number: 42 };
      const formatted = formatter.formatJSON(obj);

      expect(formatted).toContain('"key"');
      expect(formatted).toContain('"value"');
    });

    it('should handle non-serializable objects', () => {
      const circular: any = { key: 'value' };
      circular.self = circular;

      const formatted = formatter.formatJSON(circular);
      expect(typeof formatted).toBe('string');
    });
  });

  describe('truncate', () => {
    it('should truncate text longer than max length', () => {
      const longText = 'x'.repeat(1000);
      const truncated = formatter.truncate(longText, 100);

      expect(truncated.length).toBeLessThanOrEqual(100 + 20); // +20 for truncation marker
      expect(truncated).toContain('... (truncated)');
    });

    it('should not truncate text shorter than max length', () => {
      const shortText = 'Short text';
      const result = formatter.truncate(shortText, 100);

      expect(result).toBe(shortText);
    });

    it('should use default max length when not specified', () => {
      const longText = 'x'.repeat(600);
      const truncated = formatter.truncate(longText);

      expect(truncated).toContain('... (truncated)');
    });
  });
});
