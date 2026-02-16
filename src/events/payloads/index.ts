/**
 * Central export for all event payload types.
 * Organized by category for better maintainability.
 */

// A. Session & Run Lifecycle
export type {
  SessionStartedPayload,
  PromptVariantStartedPayload,
  SessionCompletedPayload,
  SessionHaltedPayload,
  WorkflowRunSummaryPayload,
} from './session';

// B. Workflow & Steps
export type {
  WorkflowDefinedPayload,
  StepDefinition,
  DependencyDefinition,
  StepStartedPayload,
  StepCompletedPayload,
  StepBlockedPayload,
  StepSkippedPayload,
} from './workflow';

// C. LLM Context & Prompting
export type {
  LLMContextBuiltPayload,
  LLMContext,
  Message,
  ToolDefinition,
  ResourceReference,
  PostToolLLMPromptBuiltPayload,
  ToolCallResult,
} from './llm';

// D. LLM Proposals (Non-Authoritative)
export type {
  LLMProposedActionPayload,
  LLMProposedToolCallPayload,
  LLMFinalResponseGeneratedPayload,
} from './llm';

// E. Validation & Guardrails
export type {
  ToolCallValidationStartedPayload,
  ToolCallValidationPassedPayload,
  ToolCallValidationFailedPayload,
  ValidationError,
  CallBudgetExceededPayload,
  ToolLoopDetectedPayload,
} from './validation';

// F. Tool Execution
export type {
  ToolExecutionStartedPayload,
  ToolExecutionCompletedPayload,
  ToolExecutionFailedPayload,
  ToolExecutionError,
} from './tool';

// G. Transport Layer
export type {
  TransportInitializedPayload,
  TransportMessageSentPayload,
  TransportMessageReceivedPayload,
  TransportErrorPayload,
} from './transport';

// H. Tool Registry
export type {
  ToolRegistryLoadedPayload,
  ToolRegisteredPayload,
  ToolSchema,
  ToolRegistrationFailedPayload,
  ToolAvailabilityCheckedPayload,
} from './registry';

// I. Testing & Assertions
export type { AssertionPassedPayload, AssertionFailedPayload } from './testing';

// J. Diagnostics
export type {
  RuntimeErrorPayload,
  AdapterErrorPayload,
  ContextMutationAppliedPayload,
} from './diagnostics';

// K. Analysis (v1.5.0+)
export type {
  AnalysisStartedPayload,
  AnalysisCompletedPayload,
} from './analysis';
