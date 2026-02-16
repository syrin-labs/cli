/**
 * I/O monitor for tool execution.
 * Monitors filesystem and network operations via process output parsing.
 *
 * NOTE: This monitors I/O by parsing stdout/stderr output from the tool process.
 * It does NOT intercept actual system calls (that would require ptrace/dtrace).
 */

import * as path from 'path';
import type { Readable } from 'stream';
import { log } from '@/utils/logger';

/**
 * Filesystem operation type.
 */
export type FSOperation = 'read' | 'write' | 'delete' | 'mkdir' | 'rmdir';

/**
 * Filesystem operation record.
 */
export interface FSOperationRecord {
  /** Operation type */
  operation: FSOperation;
  /** File or directory path */
  path: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Network operation record.
 */
export interface NetworkOperationRecord {
  /** Request URL or endpoint */
  url: string;
  /** HTTP method (if applicable) */
  method?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * I/O monitor for tracking operations during tool execution.
 * v1.5.0: Added process I/O capture for detecting side effects.
 */
export class IOMonitor {
  private fsOperations: FSOperationRecord[] = [];
  private networkOperations: NetworkOperationRecord[] = [];
  private readonly tempDir: string;
  private readonly projectRoot: string;
  private capturedOutput: string = '';
  private captureListeners: Array<(data: string) => void> = [];

  constructor(tempDir: string, projectRoot: string) {
    this.tempDir = path.resolve(tempDir);
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Capture stdout/stderr from a process stream.
   * v1.5.0: Hooks into process I/O to detect filesystem and network operations.
   */
  captureStream(stream: Readable, streamType: 'stdout' | 'stderr'): void {
    stream.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      this.capturedOutput += text;

      // Parse for filesystem operations
      this.parseFSOperations(text);

      // Parse for network operations
      this.parseNetworkOperations(text);

      // Notify listeners
      this.captureListeners.forEach(listener => listener(text));
    });

    stream.on('error', (error: Error) => {
      log.debug(`IOMonitor ${streamType} error: ${error.message}`);
    });
  }

  /**
   * Parse text for filesystem operation patterns.
   * Detects common patterns like "Reading file:", "Writing to:", etc.
   */
  private parseFSOperations(text: string): void {
    // Pattern: Reading file: <path>
    const readPattern = /reading\s+(?:file[:\s]+)?["']?([^"'\n]+)["']?/gi;
    let match;
    while ((match = readPattern.exec(text)) !== null) {
      const filePath = match[1]?.trim();
      if (filePath) {
        this.recordFSOperation('read', filePath);
      }
    }

    // Pattern: Writing to: <path> or Saved to: <path>
    const writePattern =
      /(?:writing\s+(?:to[:\s]+)?|saved\s+(?:to[:\s]+)?|wrote\s+(?:to[:\s]+)?)["']?([^"'\n]+)["']?/gi;
    while ((match = writePattern.exec(text)) !== null) {
      const filePath = match[1]?.trim();
      if (filePath) {
        this.recordFSOperation('write', filePath);
      }
    }

    // Pattern: Deleting: <path> or Removed: <path>
    const deletePattern =
      /(?:deleting[:\s]+|removed?[:\s]+|deleted?[:\s]+)["']?([^"'\n]+)["']?/gi;
    while ((match = deletePattern.exec(text)) !== null) {
      const filePath = match[1]?.trim();
      if (filePath) {
        this.recordFSOperation('delete', filePath);
      }
    }

    // Pattern: Creating directory: <path>
    const mkdirPattern =
      /(?:creating\s+dir(?:ectory)?[:\s]+|mkdir[:\s]+)["']?([^"'\n]+)["']?/gi;
    while ((match = mkdirPattern.exec(text)) !== null) {
      const filePath = match[1]?.trim();
      if (filePath) {
        this.recordFSOperation('mkdir', filePath);
      }
    }
  }

  /**
   * Parse text for network operation patterns.
   * Detects HTTP requests, API calls, etc.
   */
  private parseNetworkOperations(text: string): void {
    // Pattern: HTTP methods with URLs
    const httpPattern =
      /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(https?:\/\/[^\s\n]+)/gi;
    let match;
    while ((match = httpPattern.exec(text)) !== null) {
      const method = match[1];
      const url = match[2];
      if (url) {
        this.recordNetworkOperation(url, method);
      }
    }

    // Pattern: Fetching: <url> or Request to: <url>
    const fetchPattern =
      /(?:fetching[:\s]+|request\s+(?:to[:\s]+)?|calling[:\s]+)["']?([^"'\n]+)["']?/gi;
    while ((match = fetchPattern.exec(text)) !== null) {
      const url = match[1]?.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        this.recordNetworkOperation(url);
      }
    }
  }

  /**
   * Get all captured output.
   */
  getCapturedOutput(): string {
    return this.capturedOutput;
  }

  /**
   * Subscribe to capture events.
   * @returns Unsubscribe function
   */
  subscribeToCaptures(listener: (data: string) => void): () => void {
    this.captureListeners.push(listener);
    return () => {
      const index = this.captureListeners.indexOf(listener);
      if (index !== -1) {
        this.captureListeners.splice(index, 1);
      }
    };
  }

  /**
   * Record a filesystem operation.
   */
  recordFSOperation(operation: FSOperation, filePath: string): void {
    const resolvedPath = path.resolve(filePath);
    this.fsOperations.push({
      operation,
      path: resolvedPath,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a network operation.
   */
  recordNetworkOperation(url: string, method?: string): void {
    this.networkOperations.push({
      url,
      method,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all filesystem operations.
   */
  getFSOperations(): readonly FSOperationRecord[] {
    return this.fsOperations;
  }

  /**
   * Get all network operations.
   */
  getNetworkOperations(): readonly NetworkOperationRecord[] {
    return this.networkOperations;
  }

  /**
   * Get filesystem operations that are side effects (writes to project files).
   * Writes to temp directory are NOT considered side effects.
   */
  getSideEffects(): FSOperationRecord[] {
    return this.fsOperations.filter(op => {
      // Only writes and deletes to project files are side effects
      if (op.operation !== 'write' && op.operation !== 'delete') {
        return false;
      }

      const resolvedPath = path.resolve(op.path);

      // Check if path is within temp directory (tempDir is already resolved in constructor)
      if (resolvedPath.startsWith(this.tempDir)) {
        return false; // Not a side effect (within temp dir)
      }

      // Check if path is within project root (projectRoot is already resolved in constructor)
      if (resolvedPath.startsWith(this.projectRoot)) {
        return true; // Side effect (write/delete to project file)
      }

      // Writes outside project root are also side effects
      return true;
    });
  }

  /**
   * Get filesystem operations filtered by operation type.
   */
  getFSOperationsByType(operation: FSOperation): readonly FSOperationRecord[] {
    return this.fsOperations.filter(op => op.operation === operation);
  }

  /**
   * Clear all recorded operations.
   */
  clear(): void {
    this.fsOperations = [];
    this.networkOperations = [];
  }

  /**
   * Get summary of I/O operations.
   */
  getSummary(): {
    totalFSOperations: number;
    sideEffects: number;
    networkOperations: number;
  } {
    return {
      totalFSOperations: this.fsOperations.length,
      sideEffects: this.getSideEffects().length,
      networkOperations: this.networkOperations.length,
    };
  }
}
