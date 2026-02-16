/**
 * Event types organized by category.
 * Total: 36 event types across 10 categories.
 */

import type {
  SessionStartedPayload,
  PromptVariantStartedPayload,
  SessionCompletedPayload,
  SessionHaltedPayload,
  WorkflowRunSummaryPayload,
} from './payloads/session';
import type {
  WorkflowDefinedPayload,
  StepStartedPayload,
  StepCompletedPayload,
  StepBlockedPayload,
  StepSkippedPayload,
} from './payloads/workflow';
import type {
  LLMContextBuiltPayload,
  PostToolLLMPromptBuiltPayload,
  LLMProposedActionPayload,
  LLMProposedToolCallPayload,
  LLMFinalResponseGeneratedPayload,
} from './payloads/llm';
import type {
  ToolCallValidationStartedPayload,
  ToolCallValidationPassedPayload,
  ToolCallValidationFailedPayload,
  CallBudgetExceededPayload,
  ToolLoopDetectedPayload,
} from './payloads/validation';
import type {
  ToolExecutionStartedPayload,
  ToolExecutionCompletedPayload,
  ToolExecutionFailedPayload,
} from './payloads/tool';
import type {
  TransportInitializedPayload,
  TransportMessageSentPayload,
  TransportMessageReceivedPayload,
  TransportErrorPayload,
} from './payloads/transport';
import type {
  ToolRegistryLoadedPayload,
  ToolRegisteredPayload,
  ToolRegistrationFailedPayload,
  ToolAvailabilityCheckedPayload,
} from './payloads/registry';
import type {
  AssertionPassedPayload,
  AssertionFailedPayload,
} from './payloads/testing';
import type {
  RuntimeErrorPayload,
  AdapterErrorPayload,
  ContextMutationAppliedPayload,
} from './payloads/diagnostics';
import type {
  AnalysisStartedPayload,
  AnalysisCompletedPayload,
} from './payloads/analysis';

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

// K. Analysis Events (v1.5.0+)
export enum AnalysisEventType {
  ANALYSIS_STARTED = 'ANALYSIS_STARTED',
  ANALYSIS_COMPLETED = 'ANALYSIS_COMPLETED',
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
  | DiagnosticEventType
  | AnalysisEventType;

/**
 * Discriminated union mapping event types to their payload types.
 * Provides type safety: ensures emit(eventType, payload) has matching types.
 *
 * Usage:
 *   type EventPayloadMap = EventTypePayloadMap;
 *   const payload: EventPayloadMap[SessionLifecycleEventType.SESSION_STARTED] = {...};
 *
 * This prevents passing wrong payload type to emit() at compile time.
 */
export type EventTypePayloadMap = {
  // A. Session & Run Lifecycle Events
  [SessionLifecycleEventType.SESSION_STARTED]: SessionStartedPayload;
  [SessionLifecycleEventType.PROMPT_VARIANT_STARTED]: PromptVariantStartedPayload;
  [SessionLifecycleEventType.SESSION_COMPLETED]: SessionCompletedPayload;
  [SessionLifecycleEventType.SESSION_HALTED]: SessionHaltedPayload;
  [SessionLifecycleEventType.WORKFLOW_RUN_SUMMARY]: WorkflowRunSummaryPayload;

  // B. Workflow & Step Events
  [WorkflowEventType.WORKFLOW_DEFINED]: WorkflowDefinedPayload;
  [WorkflowEventType.STEP_STARTED]: StepStartedPayload;
  [WorkflowEventType.STEP_COMPLETED]: StepCompletedPayload;
  [WorkflowEventType.STEP_BLOCKED]: StepBlockedPayload;
  [WorkflowEventType.STEP_SKIPPED]: StepSkippedPayload;

  // C. LLM Context & Prompting Events
  [LLMContextEventType.LLM_CONTEXT_BUILT]: LLMContextBuiltPayload;
  [LLMContextEventType.POST_TOOL_LLM_PROMPT_BUILT]: PostToolLLMPromptBuiltPayload;

  // D. LLM Proposal Events - Non-Authoritative
  [LLMProposalEventType.LLM_PROPOSED_ACTION]: LLMProposedActionPayload;
  [LLMProposalEventType.LLM_PROPOSED_TOOL_CALL]: LLMProposedToolCallPayload;
  [LLMProposalEventType.LLM_FINAL_RESPONSE_GENERATED]: LLMFinalResponseGeneratedPayload;

  // E. Validation & Guardrail Events - Runtime Authority
  [ValidationEventType.TOOL_CALL_VALIDATION_STARTED]: ToolCallValidationStartedPayload;
  [ValidationEventType.TOOL_CALL_VALIDATION_PASSED]: ToolCallValidationPassedPayload;
  [ValidationEventType.TOOL_CALL_VALIDATION_FAILED]: ToolCallValidationFailedPayload;
  [ValidationEventType.CALL_BUDGET_EXCEEDED]: CallBudgetExceededPayload;
  [ValidationEventType.TOOL_LOOP_DETECTED]: ToolLoopDetectedPayload;

  // F. Tool Execution Events - Ground Truth
  [ToolExecutionEventType.TOOL_EXECUTION_STARTED]: ToolExecutionStartedPayload;
  [ToolExecutionEventType.TOOL_EXECUTION_COMPLETED]: ToolExecutionCompletedPayload;
  [ToolExecutionEventType.TOOL_EXECUTION_FAILED]: ToolExecutionFailedPayload;

  // G. Transport Layer Events
  [TransportEventType.TRANSPORT_INITIALIZED]: TransportInitializedPayload;
  [TransportEventType.TRANSPORT_MESSAGE_SENT]: TransportMessageSentPayload;
  [TransportEventType.TRANSPORT_MESSAGE_RECEIVED]: TransportMessageReceivedPayload;
  [TransportEventType.TRANSPORT_ERROR]: TransportErrorPayload;

  // H. Tool Registry & Discovery Events
  [ToolRegistryEventType.TOOL_REGISTRY_LOADED]: ToolRegistryLoadedPayload;
  [ToolRegistryEventType.TOOL_REGISTERED]: ToolRegisteredPayload;
  [ToolRegistryEventType.TOOL_REGISTRATION_FAILED]: ToolRegistrationFailedPayload;
  [ToolRegistryEventType.TOOL_AVAILABILITY_CHECKED]: ToolAvailabilityCheckedPayload;

  // I. Assertions & Testing Events
  [TestingEventType.ASSERTION_PASSED]: AssertionPassedPayload;
  [TestingEventType.ASSERTION_FAILED]: AssertionFailedPayload;

  // J. Diagnostic & Internal Error Events
  [DiagnosticEventType.RUNTIME_ERROR]: RuntimeErrorPayload;
  [DiagnosticEventType.ADAPTER_ERROR]: AdapterErrorPayload;
  [DiagnosticEventType.CONTEXT_MUTATION_APPLIED]: ContextMutationAppliedPayload;

  // K. Analysis Events (v1.5.0+)
  [AnalysisEventType.ANALYSIS_STARTED]: AnalysisStartedPayload;
  [AnalysisEventType.ANALYSIS_COMPLETED]: AnalysisCompletedPayload;
};
