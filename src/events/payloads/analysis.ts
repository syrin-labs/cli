/**
 * Payload interfaces for Analysis Events
 */

export interface AnalysisStartedPayload {
  /** Timestamp when analysis started */
  timestamp: string;
  /** Number of tools to analyze */
  toolCount: number;
}

export interface AnalysisCompletedPayload {
  /** Analysis verdict */
  verdict: 'pass' | 'fail' | 'pass-with-warnings';
  /** Number of tools analyzed */
  toolCount: number;
  /** Number of errors found */
  errorCount: number;
  /** Number of warnings found */
  warningCount: number;
  /** Analysis duration in milliseconds */
  durationMs: number;
}
