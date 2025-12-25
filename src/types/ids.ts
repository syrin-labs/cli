import type { Opaque } from '@/types/opaque';

export type SessionID = Opaque<string, 'SessionID'>;
export type EventID = Opaque<string, 'EventID'>;
export type WorkflowID = Opaque<string, 'WorkflowID'>;
export type PromptID = Opaque<string, 'PromptID'>;

export type ISO8601Timestamp = Opaque<string, 'ISO8601Timestamp'>;
export type ProjectName = Opaque<string, 'ProjectName'>;
export type SyrinVersion = Opaque<string, 'SyrinVersion'>;

// Configuration-related opaque types
export type AgentName = Opaque<string, 'AgentName'>;
export type MCPURL = Opaque<string, 'MCPURL'>;
export type Command = Opaque<string, 'Command'>;
export type APIKey = Opaque<string, 'APIKey'>;
export type ModelName = Opaque<string, 'ModelName'>;
export type ProviderIdentifier = Opaque<string, 'ProviderIdentifier'>;
export type ScriptCommand = Opaque<string, 'ScriptCommand'>;
