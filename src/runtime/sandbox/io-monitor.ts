/**
 * I/O monitor for sandboxed tool execution.
 * Monitors filesystem and network operations (does not block).
 */

import * as path from 'path';

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
 */
export class IOMonitor {
  private fsOperations: FSOperationRecord[] = [];
  private networkOperations: NetworkOperationRecord[] = [];
  private readonly tempDir: string;
  private readonly projectRoot: string;

  constructor(tempDir: string, projectRoot: string) {
    this.tempDir = path.resolve(tempDir);
    this.projectRoot = path.resolve(projectRoot);
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
