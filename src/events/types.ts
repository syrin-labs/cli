import type {
  SessionID,
  EventID,
  WorkflowID,
  PromptID,
  ISO8601Timestamp,
} from '@/types/ids';
import type { EventType } from './event-type';

export interface EventEnvelope<TPayload = unknown> {
  readonly event_id: EventID;
  readonly event_type: EventType;
  readonly session_id: SessionID;
  readonly workflow_id: WorkflowID | null;
  readonly prompt_id: PromptID | null;
  readonly timestamp: ISO8601Timestamp;
  readonly sequence: number;
  readonly source: 'runtime';
  readonly payload: TPayload;
}
