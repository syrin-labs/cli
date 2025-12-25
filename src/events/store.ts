import type { EventEnvelope } from '@/events/types';
import type { SessionID } from '@/types/ids';

/**
 * Event store interface.
 * Implementations can be synchronous (MemoryStore) or asynchronous (FileStore).
 */
export interface EventStore {
  append(event: EventEnvelope): void | Promise<void>;
  load(sessionId: SessionID): EventEnvelope[] | Promise<EventEnvelope[]>;
}
