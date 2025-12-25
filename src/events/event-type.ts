/**
 * Event types organized by category.
 * Total: 36 event types across 10 categories.
 */

// A. Session & Run Lifecycle Events (5)
export enum SessionLifecycleEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  PROMPT_VARIANT_STARTED = 'PROMPT_VARIANT_STARTED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_HALTED = 'SESSION_HALTED',
  WORKFLOW_RUN_SUMMARY = 'WORKFLOW_RUN_SUMMARY',
}

// B. Workflow & Step Events (5)
export enum WorkflowEventType {
  WORKFLOW_DEFINED = 'WORKFLOW_DEFINED',
  STEP_STARTED = 'STEP_STARTED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_BLOCKED = 'STEP_BLOCKED',
  STEP_SKIPPED = 'STEP_SKIPPED',
}

// C. LLM Context & Prompting Events (2)
export enum LLMContextEventType {
  LLM_CONTEXT_BUILT = 'LLM_CONTEXT_BUILT',
  POST_TOOL_LLM_PROMPT_BUILT = 'POST_TOOL_LLM_PROMPT_BUILT',
}

// D. LLM Proposal Events - Non-Authoritative (3)
export enum LLMProposalEventType {
  LLM_PROPOSED_ACTION = 'LLM_PROPOSED_ACTION',
  LLM_PROPOSED_TOOL_CALL = 'LLM_PROPOSED_TOOL_CALL',
  LLM_FINAL_RESPONSE_GENERATED = 'LLM_FINAL_RESPONSE_GENERATED',
}

// E. Validation & Guardrail Events - Runtime Authority (5)
export enum ValidationEventType {
  TOOL_CALL_VALIDATION_STARTED = 'TOOL_CALL_VALIDATION_STARTED',
  TOOL_CALL_VALIDATION_PASSED = 'TOOL_CALL_VALIDATION_PASSED',
  TOOL_CALL_VALIDATION_FAILED = 'TOOL_CALL_VALIDATION_FAILED',
  CALL_BUDGET_EXCEEDED = 'CALL_BUDGET_EXCEEDED',
  TOOL_LOOP_DETECTED = 'TOOL_LOOP_DETECTED',
}

// F. Tool Execution Events - Ground Truth (3)
export enum ToolExecutionEventType {
  TOOL_EXECUTION_STARTED = 'TOOL_EXECUTION_STARTED',
  TOOL_EXECUTION_COMPLETED = 'TOOL_EXECUTION_COMPLETED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
}

// G. Transport Layer Events (4)
export enum TransportEventType {
  TRANSPORT_INITIALIZED = 'TRANSPORT_INITIALIZED',
  TRANSPORT_MESSAGE_SENT = 'TRANSPORT_MESSAGE_SENT',
  TRANSPORT_MESSAGE_RECEIVED = 'TRANSPORT_MESSAGE_RECEIVED',
  TRANSPORT_ERROR = 'TRANSPORT_ERROR',
}

// H. Tool Registry & Discovery Events (4)
export enum ToolRegistryEventType {
  TOOL_REGISTRY_LOADED = 'TOOL_REGISTRY_LOADED',
  TOOL_REGISTERED = 'TOOL_REGISTERED',
  TOOL_REGISTRATION_FAILED = 'TOOL_REGISTRATION_FAILED',
  TOOL_AVAILABILITY_CHECKED = 'TOOL_AVAILABILITY_CHECKED',
}

// I. Assertions & Testing Events (2)
export enum TestingEventType {
  ASSERTION_PASSED = 'ASSERTION_PASSED',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
}

// J. Diagnostic & Internal Error Events (3)
export enum DiagnosticEventType {
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  CONTEXT_MUTATION_APPLIED = 'CONTEXT_MUTATION_APPLIED',
}

/**
 * Union type of all event types.
 * This is the canonical EventType used throughout the system.
 */
export type EventType =
  | SessionLifecycleEventType
  | WorkflowEventType
  | LLMContextEventType
  | LLMProposalEventType
  | ValidationEventType
  | ToolExecutionEventType
  | TransportEventType
  | ToolRegistryEventType
  | TestingEventType
  | DiagnosticEventType;
