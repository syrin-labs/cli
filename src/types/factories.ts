import type {
  SessionID,
  EventID,
  ISO8601Timestamp,
  WorkflowID,
  PromptID,
  ProjectName,
  AgentName,
  MCPURL,
  Command,
  APIKey,
  ModelName,
  ProviderIdentifier,
  ScriptCommand,
  SyrinVersion,
} from '@/types/ids';

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

export function makeProjectName(value: string): ProjectName {
  return value as ProjectName;
}

export function makeAgentName(value: string): AgentName {
  return value as AgentName;
}

export function makeMCPURL(value: string): MCPURL {
  return value as MCPURL;
}

export function makeCommand(value: string): Command {
  return value as Command;
}

export function makeAPIKey(value: string): APIKey {
  return value as APIKey;
}

export function makeModelName(value: string): ModelName {
  return value as ModelName;
}

export function makeProviderIdentifier(value: string): ProviderIdentifier {
  return value as ProviderIdentifier;
}

export function makeScriptCommand(value: string): ScriptCommand {
  return value as ScriptCommand;
}

export function makeSyrinVersion(value: string): SyrinVersion {
  return value as SyrinVersion;
}
