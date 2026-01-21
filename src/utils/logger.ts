/**
 * Unified logging utility for Syrin.
 * Combines structured logging with styled console output.
 */

import { Icons } from '@/constants/icons';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export const Icon = {
  ERROR: Icons.ERROR,
  WARNING: Icons.WARNING,
  TIP: Icons.TIP,
  SUCCESS: Icons.SUCCESS,
  FAILURE: Icons.FAILURE,
  CHECK: Icons.CHECK,
  FOLDER: Icons.FOLDER,
  DOCUMENT: Icons.DOCUMENT,
} as const;

export type IconType = (typeof Icon)[keyof typeof Icon];

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
} as const;

type ColorKey = keyof typeof colors;

/**
 * Unified logger class with structured logging and styled output.
 */
export class Log {
  private level: LogLevel;
  private context: Record<string, unknown>;
  private useStructuredLogging: boolean;

  constructor(
    level: LogLevel = LogLevel.INFO,
    context: Record<string, unknown> = {},
    useStructuredLogging: boolean = false
  ) {
    this.level = level;
    this.context = context;
    this.useStructuredLogging = useStructuredLogging;
  }

  /**
   * Create a child logger with additional context.
   */
  child(additionalContext: Record<string, unknown>): Log {
    return new Log(
      this.level,
      { ...this.context, ...additionalContext },
      this.useStructuredLogging
    );
  }

  /**
   * Set the log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if the logger is in quiet mode (only errors shown).
   */
  isQuiet(): boolean {
    return this.level >= LogLevel.ERROR;
  }

  /**
   * Enable or disable structured logging.
   */
  setStructuredLogging(enabled: boolean): void {
    this.useStructuredLogging = enabled;
  }

  /**
   * Style text with colors and formatting.
   */
  private style(text: string, ...styles: ColorKey[]): string {
    const styleCodes = styles.map(s => colors[s]).join('');
    return `${styleCodes}${text}${colors.reset}`;
  }

  /**
   * Internal structured logging method.
   */
  private structuredLog(
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
      // Use console.error for structured logging errors to maintain proper error output
      console.error(`${prefix} ${message}`, {
        ...entry.context,
        error: error.message,
        stack: error.stack,
      });
    } else if (context && Object.keys(context).length > 0) {
      // Use console.log for structured logging to maintain proper log format
      console.log(`${prefix} ${message}`, entry.context);
    } else {
      // Use console.log for structured logging to maintain proper log format
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Print styled text to console at INFO level.
   * Respects log level - won't print if level is higher than INFO.
   */
  private print(text: string, ...styles: ColorKey[]): void {
    if (LogLevel.INFO < this.level) {
      return; // Skip if log level is higher than INFO (e.g., quiet mode)
    }
    if (this.useStructuredLogging) {
      this.structuredLog(LogLevel.INFO, text);
    } else {
      console.log(this.style(text, ...styles));
    }
  }

  // ==================== Unified Logging Methods ====================
  // These methods behave differently based on useStructuredLogging flag:
  // - If useStructuredLogging is true: structured logging with levels
  // - If useStructuredLogging is false: styled output with icons

  /**
   * Print a heading (green, bold).
   */
  heading(text: string): void {
    this.print(text, 'bold', 'green');
  }

  /**
   * Print a label (dim).
   */
  label(text: string): void {
    this.print(text, 'dim');
  }

  /**
   * Print a value (cyan).
   */
  value(text: string): void {
    this.print(text, 'cyan');
  }

  /**
   * Log/print success message (green) with success icon.
   * For structured logging: logs at INFO level
   * For styled output: prints with green color and success icon
   */
  success(text: string, icon?: IconType): void {
    if (this.useStructuredLogging) {
      this.structuredLog(LogLevel.INFO, text);
    } else {
      const iconText = icon ? `${icon} ` : `${Icon.SUCCESS} `;
      this.print(`${iconText}${text}`, 'green');
    }
  }

  /**
   * Log/print error message (red) with error icon.
   * For structured logging: logs at ERROR level (can include Error object)
   * For styled output: prints with red color and error icon
   * Note: Errors always show regardless of log level (for quiet mode).
   */
  error(
    message: string,
    errorOrIcon?: Error | IconType,
    contextOrIcon?: Record<string, unknown> | IconType
  ): void {
    if (this.useStructuredLogging) {
      // Structured logging: errorOrIcon is Error, contextOrIcon is context
      const err = errorOrIcon instanceof Error ? errorOrIcon : undefined;
      const context =
        errorOrIcon instanceof Error
          ? (contextOrIcon as Record<string, unknown> | undefined)
          : (errorOrIcon as Record<string, unknown> | undefined);
      this.structuredLog(LogLevel.ERROR, message, context, err);
    } else {
      // Styled output: errorOrIcon is optional Icon
      // Errors always print regardless of log level (critical for quiet mode)
      const icon = errorOrIcon as IconType | undefined;
      const iconText = icon ? `${icon} ` : `${Icon.ERROR} `;
      console.log(this.style(`${iconText}${message}`, 'red'));
    }
  }

  /**
   * Log/print warning message (yellow) with warning icon.
   * For structured logging: logs at WARN level
   * For styled output: prints with yellow color and warning icon
   */
  warning(text: string, context?: Record<string, unknown>): void;
  warning(text: string, icon?: IconType): void;
  warning(
    text: string,
    contextOrIcon?: Record<string, unknown> | IconType
  ): void {
    if (this.useStructuredLogging) {
      // For structured logging, second param is always context
      const context = contextOrIcon as Record<string, unknown> | undefined;
      this.structuredLog(LogLevel.WARN, text, context);
    } else {
      // For styled output, second param is always icon
      const icon = contextOrIcon as IconType | undefined;
      const iconText = icon ? `${icon} ` : `${Icon.WARNING} `;
      this.print(`${iconText}${text}`, 'yellow');
    }
  }

  /**
   * Alias for warning() to match standard logging convention (warn).
   * For structured logging: logs at WARN level
   * For styled output: prints with yellow color and warning icon
   */
  warn(text: string, context?: Record<string, unknown>): void;
  warn(text: string, icon?: IconType): void;
  warn(text: string, contextOrIcon?: Record<string, unknown> | IconType): void {
    if (this.useStructuredLogging) {
      // For structured logging, second param is always context
      const context = contextOrIcon as Record<string, unknown> | undefined;
      this.structuredLog(LogLevel.WARN, text, context);
    } else {
      // For styled output, second param is always icon
      const icon = contextOrIcon as IconType | undefined;
      const iconText = icon ? `${icon} ` : `${Icon.WARNING} `;
      this.print(`${iconText}${text}`, 'yellow');
    }
  }

  /**
   * Log/print info message (cyan) with tip icon.
   * For structured logging: logs at INFO level
   * For styled output: prints with cyan color and tip icon
   */
  info(text: string, context?: Record<string, unknown>): void;
  info(text: string, icon?: IconType): void;
  info(text: string, contextOrIcon?: Record<string, unknown> | IconType): void {
    if (this.useStructuredLogging) {
      // For structured logging, second param is always context
      const context = contextOrIcon as Record<string, unknown> | undefined;
      this.structuredLog(LogLevel.INFO, text, context);
    } else {
      // For styled output, second param is always icon
      const icon = contextOrIcon as IconType | undefined;
      const iconText = icon ? `${icon} ` : `${Icon.TIP} `;
      this.print(`${iconText}${text}`, 'cyan');
    }
  }

  /**
   * Log/print debug message (dim).
   * For structured logging: logs at DEBUG level
   * For styled output: prints with dim color
   */
  debug(text: string, context?: Record<string, unknown>): void;
  debug(text: string, icon?: IconType): void;
  debug(
    text: string,
    contextOrIcon?: Record<string, unknown> | IconType
  ): void {
    if (this.useStructuredLogging) {
      // For structured logging, second param is always context
      const context = contextOrIcon as Record<string, unknown> | undefined;
      this.structuredLog(LogLevel.DEBUG, text, context);
    } else {
      // For styled output, second param is always icon
      const icon = contextOrIcon as IconType | undefined;
      const iconText = icon ? `${icon} ` : '';
      this.print(`${iconText}${text}`, 'dim');
    }
  }

  /**
   * Print a line with label and value.
   * Respects log level.
   */
  labelValue(labelText: string, valueText: string): void {
    if (LogLevel.INFO < this.level) {
      return; // Skip if log level is higher than INFO
    }
    const output = `${this.style(labelText, 'dim')} ${this.style(valueText, 'cyan')}`;
    if (this.useStructuredLogging) {
      this.structuredLog(LogLevel.INFO, `${labelText} ${valueText}`);
    } else {
      console.log(output);
    }
  }

  /**
   * Print a numbered item.
   */
  numberedItem(
    number: number,
    text: string,
    ...additionalStyles: ColorKey[]
  ): void {
    this.print(`${number}. ${text}`, 'bold', 'green', ...additionalStyles);
  }

  /**
   * Print a checkmark with text.
   */
  checkmark(text: string): void {
    this.print(`${Icons.SUCCESS} ${text}`, 'green', 'bold');
  }

  /**
   * Print an X mark with text.
   */
  xmark(text: string): void {
    this.print(`${Icons.FAILURE} ${text}`, 'red', 'bold');
  }

  /**
   * Get a styled tick/checkmark (✓) in green.
   * Returns a styled string that can be used in other messages.
   */
  tick(): string {
    return this.styleText(Icons.SUCCESS, 'green');
  }

  /**
   * Get a styled cross/X mark (✗) in red.
   * Returns a styled string that can be used in other messages.
   */
  cross(): string {
    return this.styleText(Icons.FAILURE, 'red');
  }

  /**
   * Print a warning symbol with text.
   */
  warnSymbol(text: string): void {
    this.print(`⚠  ${text}`, 'yellow');
  }

  /**
   * Print plain text (no styling).
   * Respects log level.
   */
  plain(text: string): void {
    if (LogLevel.INFO < this.level) {
      return; // Skip if log level is higher than INFO
    }
    if (this.useStructuredLogging) {
      this.structuredLog(LogLevel.INFO, text);
    } else {
      console.log(text);
    }
  }

  /**
   * Print an empty line.
   * Respects log level.
   */
  blank(): void {
    if (LogLevel.INFO < this.level) {
      return; // Skip if log level is higher than INFO
    }
    console.log('');
  }

  /**
   * Style text with colors and formatting (returns styled string).
   * This is a public method that can be used to get styled strings without printing.
   */
  styleText(text: string, ...styles: ColorKey[]): string {
    return this.style(text, ...styles);
  }
}

/**
 * Default logger instance for styled output.
 * Use this for all logging throughout the application.
 */
export const log = new Log(LogLevel.INFO, {}, false);

/**
 * Set quiet mode (errors only).
 * @param enabled - Whether to enable quiet mode
 */
export function setQuietMode(enabled: boolean): void {
  if (enabled) {
    log.setLevel(LogLevel.ERROR);
  }
}

/**
 * Set verbose mode (debug level).
 * @param enabled - Whether to enable verbose mode
 */
export function setVerboseMode(enabled: boolean): void {
  if (enabled) {
    log.setLevel(LogLevel.DEBUG);
  }
}

/**
 * Create a logger with a specific context.
 */
export function createLogger(context: Record<string, unknown>): Log {
  return log.child(context);
}
