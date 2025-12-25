/**
 * Payload interfaces for Session & Run Lifecycle Events
 */

export interface SessionStartedPayload {
  project_name: string;
  syrin_version: string;
}

export interface PromptVariantStartedPayload {
  prompt_variant_id: string;
  prompt_text: string;
}

export interface SessionCompletedPayload {
  status: 'success';
  duration_ms: number;
  total_tool_calls: number;
  total_llm_calls: number;
}

export interface SessionHaltedPayload {
  reason: string;
  error_code?: string;
  last_event_id?: string;
}

export interface WorkflowRunSummaryPayload {
  workflow_id: string;
  prompt_id: string;
  status: 'completed' | 'halted' | 'failed';
  duration_ms: number;
  steps_completed: number;
  steps_total: number;
  tool_calls_count: number;
}
