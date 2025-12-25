/**
 * Payload interfaces for Workflow & Step Events
 */

import type { WorkflowID } from '@/types/ids';

export interface WorkflowDefinedPayload {
  workflow_id: WorkflowID;
  steps: StepDefinition[];
  dependencies: DependencyDefinition[];
}

export interface StepDefinition {
  step_id: string;
  step_name: string;
  tool_name?: string;
  required: boolean;
}

export interface DependencyDefinition {
  step_id: string;
  depends_on: string[];
}

export interface StepStartedPayload {
  step_id: string;
  step_name: string;
  workflow_id: WorkflowID;
}

export interface StepCompletedPayload {
  step_id: string;
  step_name: string;
  workflow_id: WorkflowID;
  duration_ms: number;
  result?: unknown;
}

export interface StepBlockedPayload {
  step_id: string;
  step_name: string;
  workflow_id: WorkflowID;
  missing_dependencies: string[];
  reason: string;
}

export interface StepSkippedPayload {
  step_id: string;
  step_name: string;
  workflow_id: WorkflowID;
  reason: string;
}
