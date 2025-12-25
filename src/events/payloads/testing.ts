/**
 * Payload interfaces for Assertions & Testing Events
 */

export interface AssertionPassedPayload {
  assertion_id: string;
  assertion_type: 'event_sequence' | 'event_property' | 'tool_call' | 'custom';
  description: string;
}

export interface AssertionFailedPayload {
  assertion_id: string;
  assertion_type: 'event_sequence' | 'event_property' | 'tool_call' | 'custom';
  description: string;
  expected: string | number | boolean | Record<string, unknown> | unknown[];
  actual: string | number | boolean | Record<string, unknown> | unknown[];
  failure_reason: string;
}
