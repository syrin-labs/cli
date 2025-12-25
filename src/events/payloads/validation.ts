/**
 * Payload interfaces for Validation & Guardrail Events (Runtime Authority)
 */

export interface ToolCallValidationStartedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  validation_rules: string[];
}

export interface ToolCallValidationPassedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  validated_at: string;
}

export interface ToolCallValidationFailedPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
  failure_reason: string;
  validation_errors: ValidationError[];
}

export interface ValidationError {
  field?: string;
  message: string;
  code: string;
}

export interface CallBudgetExceededPayload {
  tool_name: string;
  current_count: number;
  max_allowed: number;
  budget_type: 'per_tool' | 'total' | 'per_session';
}

export interface ToolLoopDetectedPayload {
  tool_name: string;
  loop_pattern: string[];
  detection_method: 'pattern_match' | 'cycle_detection' | 'threshold_exceeded';
  threshold?: number;
}
