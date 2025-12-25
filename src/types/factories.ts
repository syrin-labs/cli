import type {
  SessionID,
  EventID,
  ISO8601Timestamp,
  WorkflowID,
  PromptID,
} from './ids';

export function makeSessionID(value: string): SessionID {
  return value as SessionID;
}

export function makeEventID(value: string): EventID {
  return value as EventID;
}

export function makeTimestamp(value: string): ISO8601Timestamp {
  return value as ISO8601Timestamp;
}

export function makeWorkflowID(value: string): WorkflowID {
  return value as WorkflowID;
}

export function makePromptID(value: string): PromptID {
  return value as PromptID;
}
