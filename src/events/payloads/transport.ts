/**
 * Payload interfaces for Transport Layer Events
 */

export interface TransportInitializedPayload {
  transport_type: 'stdio' | 'http' | 'websocket';
  endpoint?: string;
  command?: string;
}

export interface TransportMessageSentPayload {
  transport_type: 'stdio' | 'http' | 'websocket';
  message_type: string;
  message_id?: string;
  size_bytes: number;
  // Optional request details for tools/call messages
  tool_name?: string;
  tool_arguments?: Record<string, unknown>;
  request_body?: string; // JSON stringified request body
}

export interface TransportMessageReceivedPayload {
  transport_type: 'stdio' | 'http' | 'websocket';
  message_type: string;
  message_id?: string;
  size_bytes: number;
}

export interface TransportErrorPayload {
  transport_type: 'stdio' | 'http' | 'websocket';
  error_message: string;
  error_code: string;
  recoverable: boolean;
}
