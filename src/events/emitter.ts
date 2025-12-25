import type { EventEnvelope } from '@/events/types';
import type { EventType } from '@/events/event-type';
import type { EventStore } from '@/events/store';
import { makeEventID, makeTimestamp } from '@/types/factories';
import type { SessionID, WorkflowID, PromptID } from '@/types/ids';
import { logger } from '@/utils/logger';
import { EventStoreError } from '@/utils/errors';

/**
 * Event emitter interface.
 * Supports both sync and async event stores.
 */
export interface EventEmitter {
  /**
   * Emit an event and append it to the event store.
   * Returns the event envelope.
   * For async stores, the promise resolves after the event is persisted.
   */
  emit<TPayload>(
    eventType: EventType,
    payload: TPayload
  ): EventEnvelope<TPayload> | Promise<EventEnvelope<TPayload>>;
}

/**
 * Runtime event emitter implementation.
 * Handles event creation, sequencing, and persistence.
 */
export class RuntimeEventEmitter implements EventEmitter {
  private sequence: number = 0;

  constructor(
    private readonly store: EventStore,
    private readonly sessionId: SessionID,
    private readonly workflowId: WorkflowID | null,
    private readonly promptId: PromptID | null
  ) {}

  emit<TPayload>(
    eventType: EventType,
    payload: TPayload
  ): EventEnvelope<TPayload> | Promise<EventEnvelope<TPayload>> {
    const event: EventEnvelope<TPayload> = {
      event_id: makeEventID(this.generateEventID()),
      event_type: eventType,
      session_id: this.sessionId,
      workflow_id: this.workflowId,
      prompt_id: this.promptId,
      timestamp: makeTimestamp(new Date().toISOString()),
      sequence: ++this.sequence,
      source: 'runtime',
      payload,
    };

    try {
      const appendResult = this.store.append(event);

      // Handle both sync and async stores
      if (appendResult instanceof Promise) {
        return appendResult
          .then(() => {
            logger.debug(`Event emitted: ${eventType}`, {
              event_id: event.event_id,
              sequence: event.sequence,
            });
            return event;
          })
          .catch((error: unknown) => {
            const err =
              error instanceof Error ? error : new Error(String(error));
            logger.error('Failed to persist event', err, {
              event_id: event.event_id,
              event_type: eventType,
            });
            throw new EventStoreError('Failed to persist event', {
              event,
              context: { event_type: eventType },
              cause: err,
            });
          });
      }

      // Sync store
      logger.debug(`Event emitted: ${eventType}`, {
        event_id: event.event_id,
        sequence: event.sequence,
      });
      return event;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to emit event', err, {
        event_id: event.event_id,
        event_type: eventType,
      });
      throw new EventStoreError('Failed to emit event', {
        event,
        context: { event_type: eventType },
        cause: err,
      });
    }
  }

  /**
   * Get the current sequence number.
   */
  getSequence(): number {
    return this.sequence;
  }

  /**
   * Get the session ID.
   */
  getSessionId(): SessionID {
    return this.sessionId;
  }

  private generateEventID(): string {
    return `${this.sessionId}-${this.sequence + 1}`;
  }
}
