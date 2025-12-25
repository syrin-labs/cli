import type { Opaque } from '@/types/opaque';

export type SessionID = Opaque<string, 'SessionID'>;
export type EventID = Opaque<string, 'EventID'>;
export type WorkflowID = Opaque<string, 'WorkflowID'>;
export type PromptID = Opaque<string, 'PromptID'>;

export type ISO8601Timestamp = Opaque<string, 'ISO8601Timestamp'>;
export type ProjectName = Opaque<string, 'ProjectName'>;
export type SyrinVersion = Opaque<string, 'SyrinVersion'>;
