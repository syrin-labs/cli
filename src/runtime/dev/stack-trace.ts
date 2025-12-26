/**
 * Stack trace generation from events.
 * Generates human-readable stack traces from event sequences to aid debugging.
 */

import type { EventStore } from '@/events/store';
import type { EventEnvelope } from '@/events/types';
import type { SessionID, EventID } from '@/types/ids';
import {
  ToolExecutionEventType,
  TransportEventType,
  ValidationEventType,
  LLMProposalEventType,
  DiagnosticEventType,
  SessionLifecycleEventType,
} from '@/events/event-type';
import type { EventType } from '@/events/event-type';

/**
 * Stack trace entry representing a single event in the trace.
 */
export interface StackTraceEntry {
  /** Event ID */
  eventId: EventID;
  /** Event type */
  eventType: EventType;
  /** Timestamp */
  timestamp: string;
  /** Sequence number */
  sequence: number;
  /** Human-readable description */
  description: string;
  /** Additional context (tool name, error message, etc.) */
  context?: Record<string, unknown>;
  /** Indicates if this entry represents an error */
  isError: boolean;
  /** Indicates if this entry is a critical point in execution */
  isCritical: boolean;
}

/**
 * Stack trace result containing entries and metadata.
 */
export interface StackTrace {
  /** Session ID */
  sessionId: SessionID;
  /** Stack trace entries in chronological order */
  entries: StackTraceEntry[];
  /** Total number of events in the session */
  totalEvents: number;
  /** Number of error events */
  errorCount: number;
  /** First error event (if any) */
  firstError?: StackTraceEntry;
  /** Summary of the trace */
  summary: string;
}

/**
 * Options for generating a stack trace.
 */
export interface StackTraceOptions {
  /** Include all events or only critical/error events */
  includeAll?: boolean;
  /** Maximum number of entries to include */
  maxEntries?: number;
  /** Filter by specific event types */
  eventTypes?: EventType[];
  /** Filter by execution ID (for tool execution traces) */
  executionId?: string;
  /** Include context in entries */
  includeContext?: boolean;
}

/**
 * Generate a human-readable description for an event.
 */
function describeEvent(event: EventEnvelope): string {
  const { event_type, payload } = event;

  switch (event_type) {
    case SessionLifecycleEventType.SESSION_STARTED:
      return 'Session started';

    case SessionLifecycleEventType.SESSION_COMPLETED:
      return 'Session completed successfully';

    case SessionLifecycleEventType.SESSION_HALTED:
      return 'Session halted';

    case LLMProposalEventType.LLM_PROPOSED_TOOL_CALL: {
      const p = payload as { tool_name?: string; arguments?: Record<string, unknown> };
      const toolName = p.tool_name || 'unknown';
      return `LLM proposed tool call: ${toolName}`;
    }

    case LLMProposalEventType.LLM_FINAL_RESPONSE_GENERATED:
      return 'LLM generated final response';

    case ValidationEventType.TOOL_CALL_VALIDATION_STARTED: {
      const p = payload as { tool_name?: string };
      const toolName = p.tool_name || 'unknown';
      return `Validating tool call: ${toolName}`;
    }

    case ValidationEventType.TOOL_CALL_VALIDATION_PASSED: {
      const p = payload as { tool_name?: string };
      const toolName = p.tool_name || 'unknown';
      return `Tool call validation passed: ${toolName}`;
    }

    case ValidationEventType.TOOL_CALL_VALIDATION_FAILED: {
      const p = payload as { tool_name?: string; error?: { message?: string } };
      const toolName = p.tool_name || 'unknown';
      const errorMsg = p.error?.message || 'Unknown validation error';
      return `Tool call validation failed: ${toolName} - ${errorMsg}`;
    }

    case ToolExecutionEventType.TOOL_EXECUTION_STARTED: {
      const p = payload as { tool_name?: string; execution_id?: string };
      const toolName = p.tool_name || 'unknown';
      return `Tool execution started: ${toolName}`;
    }

    case ToolExecutionEventType.TOOL_EXECUTION_COMPLETED: {
      const p = payload as {
        tool_name?: string;
        execution_id?: string;
        duration_ms?: number;
      };
      const toolName = p.tool_name || 'unknown';
      const duration = p.duration_ms ? `${p.duration_ms}ms` : 'unknown';
      return `Tool execution completed: ${toolName} (${duration})`;
    }

    case ToolExecutionEventType.TOOL_EXECUTION_FAILED: {
      const p = payload as {
        tool_name?: string;
        execution_id?: string;
        error?: { message?: string; code?: string };
      };
      const toolName = p.tool_name || 'unknown';
      const errorMsg = p.error?.message || 'Unknown error';
      return `Tool execution failed: ${toolName} - ${errorMsg}`;
    }

    case TransportEventType.TRANSPORT_INITIALIZED: {
      const p = payload as { transport_type?: string; endpoint?: string; command?: string };
      const transport = p.transport_type || 'unknown';
      const endpoint = p.endpoint || p.command || 'unknown';
      return `Transport initialized: ${transport} (${endpoint})`;
    }

    case TransportEventType.TRANSPORT_MESSAGE_SENT: {
      const p = payload as { message_type?: string; size_bytes?: number };
      const msgType = p.message_type || 'unknown';
      const size = p.size_bytes ? `${p.size_bytes} bytes` : 'unknown size';
      return `Transport message sent: ${msgType} (${size})`;
    }

    case TransportEventType.TRANSPORT_MESSAGE_RECEIVED: {
      const p = payload as { message_type?: string; size_bytes?: number };
      const msgType = p.message_type || 'unknown';
      const size = p.size_bytes ? `${p.size_bytes} bytes` : 'unknown size';
      return `Transport message received: ${msgType} (${size})`;
    }

    case TransportEventType.TRANSPORT_ERROR: {
      const p = payload as { error_message?: string; error_code?: string };
      const errorMsg = p.error_message || 'Unknown transport error';
      return `Transport error: ${errorMsg}`;
    }

    case DiagnosticEventType.RUNTIME_ERROR: {
      const p = payload as { error_message?: string; error_code?: string };
      const errorMsg = p.error_message || 'Unknown runtime error';
      return `Runtime error: ${errorMsg}`;
    }

    default:
      return `${event_type}`;
  }
}

/**
 * Extract context from an event payload.
 */
function extractContext(event: EventEnvelope): Record<string, unknown> | undefined {
  const { event_type, payload } = event;
  const context: Record<string, unknown> = {};

  switch (event_type) {
    case ToolExecutionEventType.TOOL_EXECUTION_STARTED:
    case ToolExecutionEventType.TOOL_EXECUTION_COMPLETED:
    case ToolExecutionEventType.TOOL_EXECUTION_FAILED: {
      const p = payload as {
        tool_name?: string;
        arguments?: Record<string, unknown>;
        execution_id?: string;
        error?: unknown;
        result?: unknown;
        duration_ms?: number;
      };
      if (p.tool_name) context.tool_name = p.tool_name;
      if (p.execution_id) context.execution_id = p.execution_id;
      if (p.arguments) context.arguments = p.arguments;
      if (p.error) context.error = p.error;
      if (p.result) context.result = p.result;
      if (p.duration_ms !== undefined) context.duration_ms = p.duration_ms;
      break;
    }

    case TransportEventType.TRANSPORT_INITIALIZED:
    case TransportEventType.TRANSPORT_MESSAGE_SENT:
    case TransportEventType.TRANSPORT_MESSAGE_RECEIVED:
    case TransportEventType.TRANSPORT_ERROR: {
      const p = payload as Record<string, unknown>;
      Object.assign(context, p);
      break;
    }

    case ValidationEventType.TOOL_CALL_VALIDATION_FAILED: {
      const p = payload as { tool_name?: string; error?: unknown };
      if (p.tool_name) context.tool_name = p.tool_name;
      if (p.error) context.error = p.error;
      break;
    }
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

/**
 * Determine if an event represents an error.
 */
function isErrorEvent(event: EventEnvelope): boolean {
  return (
    event.event_type === ToolExecutionEventType.TOOL_EXECUTION_FAILED ||
    event.event_type === TransportEventType.TRANSPORT_ERROR ||
    event.event_type === ValidationEventType.TOOL_CALL_VALIDATION_FAILED ||
    event.event_type === DiagnosticEventType.RUNTIME_ERROR ||
    event.event_type === SessionLifecycleEventType.SESSION_HALTED
  );
}

/**
 * Determine if an event is critical for understanding execution flow.
 */
function isCriticalEvent(event: EventEnvelope): boolean {
  return (
    isErrorEvent(event) ||
    event.event_type === SessionLifecycleEventType.SESSION_STARTED ||
    event.event_type === SessionLifecycleEventType.SESSION_COMPLETED ||
    event.event_type === SessionLifecycleEventType.SESSION_HALTED ||
    event.event_type === ToolExecutionEventType.TOOL_EXECUTION_STARTED ||
    event.event_type === ToolExecutionEventType.TOOL_EXECUTION_COMPLETED ||
    event.event_type === ToolExecutionEventType.TOOL_EXECUTION_FAILED ||
    event.event_type === ValidationEventType.TOOL_CALL_VALIDATION_FAILED ||
    event.event_type === TransportEventType.TRANSPORT_ERROR ||
    event.event_type === DiagnosticEventType.RUNTIME_ERROR
  );
}

/**
 * Generate a stack trace from events for a given session.
 *
 * @param eventStore - Event store to query
 * @param sessionId - Session ID to generate trace for
 * @param options - Stack trace generation options
 * @returns Stack trace
 */
export async function generateStackTrace(
  eventStore: EventStore,
  sessionId: SessionID,
  options: StackTraceOptions = {}
): Promise<StackTrace> {
  const {
    includeAll = false,
    maxEntries,
    eventTypes,
    executionId,
    includeContext = true,
  } = options;

  // Load events for the session
  const events = await Promise.resolve(eventStore.load(sessionId));
  const totalEvents = events.length;

  // Filter events
  let filteredEvents = events;

  // Filter by event types if specified
  if (eventTypes && eventTypes.length > 0) {
    filteredEvents = filteredEvents.filter((e) => eventTypes.includes(e.event_type));
  }

  // Filter by execution ID if specified
  if (executionId) {
    filteredEvents = filteredEvents.filter((e) => {
      const payload = e.payload as { execution_id?: string };
      return payload.execution_id === executionId;
    });
  }

  // Filter to critical/error events if not including all
  if (!includeAll) {
    filteredEvents = filteredEvents.filter((e) => isCriticalEvent(e));
  }

  // Sort by sequence number
  filteredEvents.sort((a, b) => a.sequence - b.sequence);

  // Limit entries if specified
  if (maxEntries && filteredEvents.length > maxEntries) {
    filteredEvents = filteredEvents.slice(-maxEntries);
  }

  // Convert to stack trace entries
  const entries: StackTraceEntry[] = filteredEvents.map((event) => ({
    eventId: event.event_id,
    eventType: event.event_type,
    timestamp: event.timestamp,
    sequence: event.sequence,
    description: describeEvent(event),
    context: includeContext ? extractContext(event) : undefined,
    isError: isErrorEvent(event),
    isCritical: isCriticalEvent(event),
  }));

  // Count errors
  const errorCount = entries.filter((e) => e.isError).length;
  const firstError = entries.find((e) => e.isError);

  // Generate summary
  let summary = `Session ${sessionId}: ${totalEvents} total events`;
  if (errorCount > 0) {
    summary += `, ${errorCount} error(s)`;
  }
  if (filteredEvents.length < totalEvents) {
    summary += `, ${filteredEvents.length} shown`;
  }

  return {
    sessionId,
    entries,
    totalEvents,
    errorCount,
    firstError,
    summary,
  };
}

/**
 * Format a stack trace as a human-readable string.
 *
 * @param stackTrace - Stack trace to format
 * @returns Formatted string
 */
export function formatStackTrace(stackTrace: StackTrace): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`STACK TRACE: ${stackTrace.summary}`);
  lines.push(`${'='.repeat(80)}\n`);

  if (stackTrace.firstError) {
    lines.push(`⚠️  First Error: ${stackTrace.firstError.description}`);
    if (stackTrace.firstError.context?.error) {
      const error = stackTrace.firstError.context.error as
        | { message?: string; code?: string }
        | undefined;
      if (error?.message) {
        lines.push(`   Message: ${error.message}`);
      }
      if (error?.code) {
        lines.push(`   Code: ${error.code}`);
      }
    }
    lines.push('');
  }

  lines.push('Event Sequence:');
  lines.push('');

  stackTrace.entries.forEach((entry, index) => {
    const prefix = entry.isError ? '❌' : entry.isCritical ? '🔍' : '  ';
    const seq = String(entry.sequence).padStart(4, '0');
    
    // Parse timestamp safely
    let time = entry.timestamp;
    try {
      const timestampParts = entry.timestamp.split('T');
      if (timestampParts.length > 1) {
        const timePart = timestampParts[1];
        if (timePart) {
          const timeParts = timePart.split('.');
          time = timeParts[0] || entry.timestamp;
        }
      }
    } catch {
      // Fallback to original timestamp if parsing fails
      time = entry.timestamp;
    }

    lines.push(`${prefix} [${seq}] ${time} - ${entry.description}`);

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      lines.push(contextStr);
    }

    if (index < stackTrace.entries.length - 1) {
      lines.push('');
    }
  });

  lines.push(`\n${'='.repeat(80)}`);

  return lines.join('\n');
}

