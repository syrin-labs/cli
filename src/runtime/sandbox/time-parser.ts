/**
 * Utility functions for parsing time strings.
 * Supports formats like "30s", "5m", "2h", "1d"
 */

/**
 * Parse a time string to milliseconds.
 * @param timeString - Time string in format: <number><unit> (e.g., "30s", "5m", "2h", "1d")
 * @returns Time in milliseconds, or undefined if invalid
 * @throws {Error} If format is invalid
 */
export function parseTimeString(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(
      `Invalid time format: "${timeString}". Expected format: <number><unit> (e.g., "30s", "5m", "2h")`
    );
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();

  if (value <= 0) {
    throw new Error(`Time value must be positive: ${value}`);
  }

  const multipliers: Record<string, number> = {
    s: 1000, // seconds to milliseconds
    m: 60 * 1000, // minutes to milliseconds
    h: 60 * 60 * 1000, // hours to milliseconds
    d: 24 * 60 * 60 * 1000, // days to milliseconds
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(
      `Unknown time unit: "${unit}". Supported units: s, m, h, d`
    );
  }

  const milliseconds = value * multiplier;

  // Check for overflow: ensure the result doesn't exceed Number.MAX_SAFE_INTEGER
  // Also check for Infinity (which can occur when multiplying very large numbers)
  if (!isFinite(milliseconds) || milliseconds > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `Time value "${timeString}" exceeds maximum safe integer (${Number.MAX_SAFE_INTEGER}ms). Use a smaller value.`
    );
  }

  return milliseconds;
}

/**
 * Format milliseconds to human-readable time string.
 * @param milliseconds - Time in milliseconds
 * @returns Human-readable time string (e.g., "5m", "2h")
 * @throws {RangeError} If milliseconds is negative
 */
export function formatTimeString(milliseconds: number): string {
  if (milliseconds < 0) {
    throw new RangeError(
      `Cannot format negative milliseconds: ${milliseconds}. Time must be non-negative.`
    );
  }

  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
