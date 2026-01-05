/**
 * Tests for stack trace generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateStackTrace, formatStackTrace } from './stack-trace';
import type { EventStore } from '@/events/store';
import type { EventEnvelope } from '@/events/types';
import type { SessionID } from '@/types/ids';
import {
  SessionLifecycleEventType,
  ToolExecutionEventType,
  ValidationEventType,
} from '@/events/event-type';

describe('Stack Trace Generation', () => {
  let mockEventStore: EventStore;
  let sessionId: SessionID;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionId = 'session-123' as SessionID;

    mockEventStore = {
      load: vi.fn(),
      save: vi.fn(),
      close: vi.fn(),
    } as unknown as EventStore;
  });

  describe('generateStackTrace', () => {
    it('should generate stack trace from events', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: SessionLifecycleEventType.SESSION_STARTED,
          payload: {},
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
        {
          event_id: 'event-2' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: {
            tool_name: 'get_user',
            execution_id: 'exec-1',
          },
          timestamp: '2024-01-01T10:00:01.000Z',
          sequence: 2,
        },
        {
          event_id: 'event-3' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
          payload: {
            tool_name: 'get_user',
            execution_id: 'exec-1',
            duration_ms: 150,
          },
          timestamp: '2024-01-01T10:00:01.150Z',
          sequence: 3,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId);

      expect(trace.sessionId).toBe(sessionId);
      expect(trace.entries).toHaveLength(3);
      expect(trace.totalEvents).toBe(3);
      expect(trace.errorCount).toBe(0);
      expect(trace.entries[0]?.description).toContain('Session started');
    });

    it('should filter to critical events only by default', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: SessionLifecycleEventType.SESSION_STARTED,
          payload: {},
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
        {
          event_id: 'event-2' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: { tool_name: 'get_user', execution_id: 'exec-1' },
          timestamp: '2024-01-01T10:00:01.000Z',
          sequence: 2,
        },
        // Non-critical event (would be filtered out)
        {
          event_id: 'event-3' as any,
          event_type: 'NON_CRITICAL_EVENT' as any,
          payload: {},
          timestamp: '2024-01-01T10:00:02.000Z',
          sequence: 3,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId);

      expect(trace.entries).toHaveLength(2); // Only critical events
      expect(trace.totalEvents).toBe(3);
    });

    it('should include all events when includeAll is true', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: SessionLifecycleEventType.SESSION_STARTED,
          payload: {},
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
        {
          event_id: 'event-2' as any,
          event_type: 'NON_CRITICAL_EVENT' as any,
          payload: {},
          timestamp: '2024-01-01T10:00:01.000Z',
          sequence: 2,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        includeAll: true,
      });

      expect(trace.entries).toHaveLength(2);
    });

    it('should filter by event types', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: { tool_name: 'tool1', execution_id: 'exec-1' },
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
        {
          event_id: 'event-2' as any,
          event_type: ValidationEventType.TOOL_CALL_VALIDATION_STARTED,
          payload: { tool_name: 'tool1' },
          timestamp: '2024-01-01T10:00:01.000Z',
          sequence: 2,
        },
        {
          event_id: 'event-3' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
          payload: { tool_name: 'tool1', execution_id: 'exec-1' },
          timestamp: '2024-01-01T10:00:02.000Z',
          sequence: 3,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        eventTypes: [ToolExecutionEventType.TOOL_EXECUTION_STARTED],
      });

      expect(trace.entries).toHaveLength(1);
      expect(trace.entries[0]?.eventType).toBe(
        ToolExecutionEventType.TOOL_EXECUTION_STARTED
      );
    });

    it('should filter by execution ID', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: { tool_name: 'tool1', execution_id: 'exec-1' },
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
        {
          event_id: 'event-2' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: { tool_name: 'tool2', execution_id: 'exec-2' },
          timestamp: '2024-01-01T10:00:01.000Z',
          sequence: 2,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        executionId: 'exec-1',
      });

      expect(trace.entries).toHaveLength(1);
      expect(trace.entries[0]?.context?.execution_id).toBe('exec-1');
    });

    it('should limit entries when maxEntries is specified', async () => {
      const events: EventEnvelope[] = Array.from({ length: 10 }, (_, i) => ({
        event_id: `event-${i}` as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: { tool_name: `tool${i}`, execution_id: `exec-${i}` },
        timestamp: `2024-01-01T10:00:${String(i).padStart(2, '0')}.000Z`,
        sequence: i + 1,
      }));

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        maxEntries: 5,
      });

      expect(trace.entries).toHaveLength(5);
    });

    it('should identify error events', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_FAILED,
          payload: {
            tool_name: 'get_user',
            execution_id: 'exec-1',
            error: { message: 'Connection failed', code: 'CONN_ERROR' },
          },
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId);

      expect(trace.errorCount).toBe(1);
      expect(trace.firstError).toBeDefined();
      expect(trace.firstError?.isError).toBe(true);
      expect(trace.firstError?.description).toContain('failed');
    });

    it('should include context when includeContext is true', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: {
            tool_name: 'get_user',
            execution_id: 'exec-1',
            arguments: { userId: '123' },
          },
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        includeContext: true,
      });

      expect(trace.entries[0]?.context).toBeDefined();
      expect(trace.entries[0]?.context?.tool_name).toBe('get_user');
    });

    it('should exclude context when includeContext is false', async () => {
      const events: EventEnvelope[] = [
        {
          event_id: 'event-1' as any,
          event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
          payload: {
            tool_name: 'get_user',
            execution_id: 'exec-1',
          },
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
        },
      ];

      vi.mocked(mockEventStore.load).mockResolvedValue(events);

      const trace = await generateStackTrace(mockEventStore, sessionId, {
        includeContext: false,
      });

      expect(trace.entries[0]?.context).toBeUndefined();
    });
  });

  describe('formatStackTrace', () => {
    it('should format stack trace as readable string', () => {
      const trace = {
        sessionId: 'session-123' as SessionID,
        entries: [
          {
            eventId: 'event-1' as any,
            eventType: SessionLifecycleEventType.SESSION_STARTED,
            timestamp: '2024-01-01T10:00:00.000Z',
            sequence: 1,
            description: 'Session started',
            isError: false,
            isCritical: true,
          },
          {
            eventId: 'event-2' as any,
            eventType: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
            timestamp: '2024-01-01T10:00:01.000Z',
            sequence: 2,
            description: 'Tool execution started: get_user',
            context: { tool_name: 'get_user' },
            isError: false,
            isCritical: true,
          },
        ],
        totalEvents: 2,
        errorCount: 0,
        summary: 'Session session-123: 2 total events',
      };

      const formatted = formatStackTrace(trace);

      expect(formatted).toContain('STACK TRACE');
      expect(formatted).toContain('Session started');
      expect(formatted).toContain('Tool execution started');
    });

    it('should include first error information when present', () => {
      const trace = {
        sessionId: 'session-123' as SessionID,
        entries: [
          {
            eventId: 'event-1' as any,
            eventType: ToolExecutionEventType.TOOL_EXECUTION_FAILED,
            timestamp: '2024-01-01T10:00:00.000Z',
            sequence: 1,
            description: 'Tool execution failed: get_user - Connection failed',
            context: {
              error: { message: 'Connection failed', code: 'CONN_ERROR' },
            },
            isError: true,
            isCritical: true,
          },
        ],
        totalEvents: 1,
        errorCount: 1,
        firstError: {
          eventId: 'event-1' as any,
          eventType: ToolExecutionEventType.TOOL_EXECUTION_FAILED,
          timestamp: '2024-01-01T10:00:00.000Z',
          sequence: 1,
          description: 'Tool execution failed: get_user - Connection failed',
          context: {
            error: { message: 'Connection failed', code: 'CONN_ERROR' },
          },
          isError: true,
          isCritical: true,
        },
        summary: 'Session session-123: 1 total events, 1 error(s)',
      };

      const formatted = formatStackTrace(trace);

      expect(formatted).toContain('First Error');
      expect(formatted).toContain('Connection failed');
      expect(formatted).toContain('CONN_ERROR');
    });

    it('should format context as indented JSON', () => {
      const trace = {
        sessionId: 'session-123' as SessionID,
        entries: [
          {
            eventId: 'event-1' as any,
            eventType: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
            timestamp: '2024-01-01T10:00:00.000Z',
            sequence: 1,
            description: 'Tool execution started: get_user',
            context: {
              tool_name: 'get_user',
              execution_id: 'exec-1',
              arguments: { userId: '123' },
            },
            isError: false,
            isCritical: true,
          },
        ],
        totalEvents: 1,
        errorCount: 0,
        summary: 'Session session-123: 1 total events',
      };

      const formatted = formatStackTrace(trace);

      expect(formatted).toContain('tool_name');
      expect(formatted).toContain('get_user');
      expect(formatted).toContain('execution_id');
    });
  });
});
