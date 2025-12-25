import type { EventEnvelope } from '@/events/types';

/**
 * Base error class for all Syrin errors.
 * All errors should extend this class to maintain consistency.
 */
export class SyrinError extends Error {
  public readonly code: string;
  public readonly event?: EventEnvelope;
  public readonly context?: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'SyrinError';
    this.code = code;
    this.event = options?.event;
    this.context = options?.context;
    this.cause = options?.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SyrinError);
    }
  }
}

/**
 * Configuration-related errors.
 */
export class ConfigurationError extends SyrinError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'CONFIG_ERROR', options);
    this.name = 'ConfigurationError';
  }
}

/**
 * Transport layer errors.
 */
export class TransportError extends SyrinError {
  constructor(
    message: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'TRANSPORT_ERROR', options);
    this.name = 'TransportError';
  }
}

/**
 * Validation errors.
 */
export class ValidationError extends SyrinError {
  constructor(
    message: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'VALIDATION_ERROR', options);
    this.name = 'ValidationError';
  }
}

/**
 * Runtime errors.
 */
export class RuntimeError extends SyrinError {
  constructor(
    message: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'RUNTIME_ERROR', options);
    this.name = 'RuntimeError';
  }
}

/**
 * Adapter errors.
 */
export class AdapterError extends SyrinError {
  constructor(
    message: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'ADAPTER_ERROR', options);
    this.name = 'AdapterError';
  }
}

/**
 * Event store errors.
 */
export class EventStoreError extends SyrinError {
  constructor(
    message: string,
    options?: {
      event?: EventEnvelope;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'EVENT_STORE_ERROR', options);
    this.name = 'EventStoreError';
  }
}
