/**
 * Payload interfaces for Diagnostic & Internal Error Events
 */

export interface RuntimeErrorPayload {
  message: string;
  error_code: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
}

export interface AdapterErrorPayload {
  adapter_type: string;
  message: string;
  error_code: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface ContextMutationAppliedPayload {
  mutation_type: 'inject' | 'modify' | 'remove';
  context_key: string;
  old_value?: unknown;
  new_value: unknown;
  reason: string;
}
