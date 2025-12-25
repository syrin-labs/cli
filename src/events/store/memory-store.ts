import type { EventEnvelope } from '@/events/types';
import type { EventStore } from '@/events/store';
import type { SessionID } from '@/types/ids';

/**
 * In-memory event store implementation.
 * Suitable for testing and development.
 * Events are lost when the process exits.
 */
export class MemoryEventStore implements EventStore {
  private events: Map<SessionID, EventEnvelope[]> = new Map();

  append(event: EventEnvelope): void {
    const sessionEvents = this.events.get(event.session_id) || [];
    sessionEvents.push(event);
    this.events.set(event.session_id, sessionEvents);
  }

  load(sessionId: SessionID): EventEnvelope[] {
    return this.events.get(sessionId) || [];
  }

  /**
   * Get all events across all sessions (useful for testing/debugging).
   */
  getAllEvents(): EventEnvelope[] {
    const allEvents: EventEnvelope[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return allEvents.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Clear all events (useful for testing).
   */
  clear(): void {
    this.events.clear();
  }

  /**
   * Get all session IDs that have events.
   */
  getSessionIds(): SessionID[] {
    return Array.from(this.events.keys());
  }
}
