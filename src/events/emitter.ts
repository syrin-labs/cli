import type { EventEnvelope } from '@/events/types';
import type { EventType, EventTypePayloadMap } from '@/events/event-type';
import type { EventStore } from '@/events/store';
import { makeEventID, makeTimestamp } from '@/types/factories';
import type { SessionID, WorkflowID, PromptID } from '@/types/ids';
import { log } from '@/utils/logger';
import { EventStoreError } from '@/utils/errors';

/**
 * Event subscriber callback type.
 * Called when an event is emitted, after it's been persisted to the store.
 */
export type EventSubscriber = (event: EventEnvelope) => void | Promise<void>;

/**
 * Event emitter interface.
 * Supports both sync and async event stores.
 * Provides type-safe emit methods using discriminated unions.
 */
export interface EventEmitter {
  /**
   * Emit an event and append it to the event store.
   * Returns the event envelope.
   * For async stores, the promise resolves after the event is persisted.
   *
   * Type-safe overload: ensures payload type matches event type.
   * Example:
   *   emitter.emit(SessionLifecycleEventType.SESSION_STARTED, { project_name: "my-project", ... })
   *   // TypeScript error if payload doesn't match SESSION_STARTED's payload type
   */
  emit<TEventType extends EventType>(
    eventType: TEventType,
    payload: EventTypePayloadMap[TEventType]
  ):
    | EventEnvelope<EventTypePayloadMap[TEventType]>
    | Promise<EventEnvelope<EventTypePayloadMap[TEventType]>>;

  /**
   * Subscribe to events.
   * The callback will be called for all events emitted after subscription.
   * Returns an unsubscribe function.
   */
  subscribe?(subscriber: EventSubscriber): () => void;
}

/**
 * Runtime event emitter implementation.
 * Handles event creation, sequencing, and persistence.
 * Supports event subscribers for real-time event notifications.
 * Uses discriminated union types for type-safe emit() calls.
 */
export class RuntimeEventEmitter implements EventEmitter {
  private sequence: number = 0;
  private subscribers: EventSubscriber[] = [];

  constructor(
    private readonly store: EventStore,
    private readonly sessionId: SessionID,
    private readonly workflowId: WorkflowID | null,
    private readonly promptId: PromptID | null
  ) {}

  emit<TEventType extends EventType>(
    eventType: TEventType,
    payload: EventTypePayloadMap[TEventType]
  ):
    | EventEnvelope<EventTypePayloadMap[TEventType]>
    | Promise<EventEnvelope<EventTypePayloadMap[TEventType]>> {
    const event: EventEnvelope<EventTypePayloadMap[TEventType]> = {
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
            log.debug(`Event emitted: ${eventType}`, {
              event_id: event.event_id,
              sequence: event.sequence,
            });
            // Notify subscribers after event is persisted
            this.notifySubscribers(event);
            return event;
          })
          .catch((error: unknown) => {
            const err =
              error instanceof Error ? error : new Error(String(error));
            log.error(`Error: ${err.message}`, err, {
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
      log.debug(`Event emitted: ${eventType}`, {
        event_id: event.event_id,
        sequence: event.sequence,
      });
      // Notify subscribers after event is persisted
      this.notifySubscribers(event);
      return event;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error(`Error: ${err.message}`, err, {
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

  /**
   * Subscribe to events.
   * The callback will be called for all events emitted after subscription.
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: EventSubscriber): () => void {
    this.subscribers.push(subscriber);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== subscriber);
    };
  }

  /**
   * Notify all subscribers of a new event.
   * Errors in subscribers are logged but don't affect event emission.
   * Subscribers are called synchronously for real-time updates.
   */
  private notifySubscribers(event: EventEnvelope): void {
    // Notify subscribers synchronously for real-time visibility
    // Errors are caught to prevent breaking event emission
    for (const subscriber of this.subscribers) {
      try {
        const result = subscriber(event);
        // Handle async subscribers
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            const err =
              error instanceof Error ? error : new Error(String(error));
            log.error(`Error: ${err.message}`, err, {
              event_id: event.event_id,
              event_type: event.event_type,
            });
          });
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(`Error: ${err.message}`, err, {
          event_id: event.event_id,
          event_type: event.event_type,
        });
      }
    }
  }

  private generateEventID(): string {
    return `${this.sessionId}-${this.sequence + 1}`;
  }
}
