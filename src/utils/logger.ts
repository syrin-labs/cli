/**
 * Structured logging utility for Syrin.
 * Provides consistent logging format and levels.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private level: LogLevel;
  private context: Record<string, unknown>;

  constructor(
    level: LogLevel = LogLevel.INFO,
    context: Record<string, unknown> = {}
  ) {
    this.level = level;
    this.context = context;
  }

  /**
   * Create a child logger with additional context.
   */
  child(additionalContext: Record<string, unknown>): Logger {
    return new Logger(this.level, { ...this.context, ...additionalContext });
  }

  /**
   * Set the log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (level < this.level) {
      return;
    }

    const mergedContext: Record<string, unknown> = {
      ...this.context,
    };
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null ||
          value === undefined
        ) {
          mergedContext[key] = value;
        }
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: mergedContext,
      error,
    };

    const levelName = LogLevel[level];
    const prefix = `[${entry.timestamp}] [${levelName}]`;

    if (error) {
      console.error(`${prefix} ${message}`, {
        ...entry.context,
        error: error.message,
        stack: error.stack,
      });
    } else if (context && Object.keys(context).length > 0) {
      console.log(`${prefix} ${message}`, entry.context);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger(LogLevel.INFO);

/**
 * Create a logger with a specific context.
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}
