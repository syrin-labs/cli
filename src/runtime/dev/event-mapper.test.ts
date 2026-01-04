/**
 * Tests for DevEventMapper.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevEventMapper } from './event-mapper';
import type { EventEmitter, EventSubscriber } from '@/events/emitter';
import type { EventEnvelope } from '@/events/types';
import type { ChatUI } from '@/presentation/dev/chat-ui';
import {
  LLMProposalEventType,
  ValidationEventType,
  ToolExecutionEventType,
  TransportEventType,
  LLMContextEventType,
} from '@/events/event-type';

describe('DevEventMapper', () => {
  let mockEventEmitter: EventEmitter;
  let mockChatUI: ChatUI;
  let mapper: DevEventMapper;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventEmitter = {
      subscribe: vi.fn(),
      emit: vi.fn(),
    } as unknown as EventEmitter;

    mockChatUI = {
      addMessage: vi.fn(),
      updateLastSystemMessage: vi.fn(),
    } as unknown as ChatUI;

    mapper = new DevEventMapper(mockEventEmitter, mockChatUI, 'Claude');
  });

  describe('constructor', () => {
    it('should create mapper with default LLM provider name', () => {
      const defaultMapper = new DevEventMapper(mockEventEmitter, mockChatUI);
      expect(defaultMapper).toBeDefined();
    });

    it('should create mapper with custom LLM provider name', () => {
      const customMapper = new DevEventMapper(
        mockEventEmitter,
        mockChatUI,
        'GPT-4'
      );
      expect(customMapper).toBeDefined();
    });
  });

  describe('start', () => {
    it('should subscribe to events', () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventEmitter.subscribe).mockReturnValue(unsubscribe);

      mapper.start();

      expect(mockEventEmitter.subscribe).toHaveBeenCalled();
    });

    it('should not subscribe if eventEmitter does not support subscriptions', () => {
      const emitterWithoutSubscribe = {} as EventEmitter;
      const mapper2 = new DevEventMapper(
        emitterWithoutSubscribe,
        mockChatUI
      );

      mapper2.start();

      // Should not throw
      expect(mapper2).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should unsubscribe from events', () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventEmitter.subscribe).mockReturnValue(unsubscribe);

      mapper.start();
      mapper.stop();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should clear all tracking maps', () => {
      mapper.start();
      mapper.stop();

      // After stop, all maps should be cleared
      // We can't directly access private maps, but we can verify stop doesn't throw
      expect(() => mapper.stop()).not.toThrow();
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventEmitter.subscribe).mockReturnValue(unsubscribe);
      mapper.start();
    });

    it('should handle LLM_PROPOSED_TOOL_CALL event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMProposalEventType.LLM_PROPOSED_TOOL_CALL,
        payload: {
          tool_name: 'get_user',
          arguments: { userId: '123' },
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      // Get the subscriber callback
      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('get_user')
      );
    });

    it('should handle TOOL_CALL_VALIDATION_STARTED event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ValidationEventType.TOOL_CALL_VALIDATION_STARTED,
        payload: {
          tool_name: 'get_user',
          validation_rules: ['E001', 'E002'],
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      // Validation started doesn't show message immediately, but stores state
      // We verify by checking validation passed shows the rules
      const passedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ValidationEventType.TOOL_CALL_VALIDATION_PASSED,
        payload: {
          tool_name: 'get_user',
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };
      subscriber(passedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('E001')
      );
    });

    it('should handle TOOL_CALL_VALIDATION_PASSED event', () => {
      const startedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ValidationEventType.TOOL_CALL_VALIDATION_STARTED,
        payload: {
          tool_name: 'get_user',
          validation_rules: ['E001', 'E002'],
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const passedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ValidationEventType.TOOL_CALL_VALIDATION_PASSED,
        payload: {
          tool_name: 'get_user',
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(startedEvent);
      subscriber(passedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Validated')
      );
    });

    it('should handle TOOL_CALL_VALIDATION_FAILED event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ValidationEventType.TOOL_CALL_VALIDATION_FAILED,
        payload: {
          tool_name: 'get_user',
          validation_errors: [
            { code: 'E001', message: 'Missing output schema' },
          ],
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Validation failed')
      );
    });

    it('should handle TOOL_EXECUTION_STARTED event', () => {
      // First propose the tool
      const proposedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMProposalEventType.LLM_PROPOSED_TOOL_CALL,
        payload: {
          tool_name: 'get_user',
          arguments: { userId: '123' },
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const startedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          arguments: { userId: '123' },
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(proposedEvent);
      subscriber(startedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Executing')
      );
    });

    it('should handle TOOL_EXECUTION_COMPLETED event', () => {
      const startedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          arguments: {},
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const completedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          result: { name: 'John', age: 30 },
          duration_ms: 150,
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(startedEvent);
      subscriber(completedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Tool Response')
      );
      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('150ms')
      );
    });

    it('should handle TOOL_EXECUTION_FAILED event', () => {
      const startedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          arguments: {},
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const failedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_FAILED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          error: { message: 'Connection failed', code: 'CONN_ERROR' },
          duration_ms: 100,
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(startedEvent);
      subscriber(failedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('failed')
      );
      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Connection failed')
      );
    });

    it('should handle TRANSPORT_MESSAGE_SENT event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: TransportEventType.TRANSPORT_MESSAGE_SENT,
        payload: {
          message_type: 'tools/call',
          size_bytes: 1024,
          tool_name: 'get_user',
          tool_arguments: { userId: '123' },
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Request sent')
      );
    });

    it('should handle TRANSPORT_MESSAGE_RECEIVED event', () => {
      // First send a message to create waiting state
      const sentEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: TransportEventType.TRANSPORT_MESSAGE_SENT,
        payload: {
          message_type: 'tools/call',
          size_bytes: 1024,
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const receivedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: TransportEventType.TRANSPORT_MESSAGE_RECEIVED,
        payload: {
          message_type: 'tools/call_response',
          size_bytes: 2048,
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(sentEvent);
      subscriber(receivedEvent);

      expect(mockChatUI.updateLastSystemMessage).toHaveBeenCalledWith(
        expect.stringContaining('Response received')
      );
    });

    it('should handle POST_TOOL_LLM_PROMPT_BUILT event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMContextEventType.POST_TOOL_LLM_PROMPT_BUILT,
        payload: {
          prompt_id: 'prompt-1',
          tool_call_result: {
            tool_name: 'get_user',
            arguments: {},
            result: {},
            duration_ms: 100,
          },
          context: {
            messages: [],
          },
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Claude')
      );
      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('generating response')
      );
    });

    it('should handle LLM_FINAL_RESPONSE_GENERATED event', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMProposalEventType.LLM_FINAL_RESPONSE_GENERATED,
        payload: {
          response_text: 'Final response',
          finish_reason: 'stop',
          token_count: 100,
          duration_ms: 500,
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      // LLM_FINAL_RESPONSE_GENERATED is a no-op, but should not throw
      expect(() => subscriber(event)).not.toThrow();
    });
  });

  describe('argument formatting', () => {
    beforeEach(() => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventEmitter.subscribe).mockReturnValue(unsubscribe);
      mapper.start();
    });

    it('should format empty arguments as empty object', () => {
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMProposalEventType.LLM_PROPOSED_TOOL_CALL,
        payload: {
          tool_name: 'get_user',
          arguments: {},
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('{}')
      );
    });

    it('should truncate very long arguments', () => {
      const longArgs = { data: 'x'.repeat(1000) };
      const event: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: LLMProposalEventType.LLM_PROPOSED_TOOL_CALL,
        payload: {
          tool_name: 'get_user',
          arguments: longArgs,
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(event);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('... (truncated)')
      );
    });
  });

  describe('result formatting', () => {
    beforeEach(() => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventEmitter.subscribe).mockReturnValue(unsubscribe);
      mapper.start();
    });

    it('should format null result', () => {
      const startedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          arguments: {},
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const completedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          result: null,
          duration_ms: 100,
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(startedEvent);
      subscriber(completedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('null')
      );
    });

    it('should truncate large results', () => {
      const largeResult = { data: 'x'.repeat(1000) };
      const startedEvent: EventEnvelope = {
        event_id: 'event-1' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_STARTED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          arguments: {},
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        sequence: 1,
      };

      const completedEvent: EventEnvelope = {
        event_id: 'event-2' as any,
        event_type: ToolExecutionEventType.TOOL_EXECUTION_COMPLETED,
        payload: {
          tool_name: 'get_user',
          execution_id: 'exec-1',
          result: largeResult,
          duration_ms: 100,
        },
        timestamp: '2024-01-01T10:00:01.000Z',
        sequence: 2,
      };

      const subscriber = vi.mocked(mockEventEmitter.subscribe).mock
        .calls[0][0] as EventSubscriber;
      subscriber(startedEvent);
      subscriber(completedEvent);

      expect(mockChatUI.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('... (truncated)')
      );
    });
  });
});
