/**
 * Data Manager for handling large data storage and references.
 * Externalizes large tool results to disk to reduce memory usage.
 */

import * as fs from 'fs';
import * as path from 'path';
import { saveJSONToFile } from '@/utils/json-file-saver';

export interface DataReference {
  id: string;
  filePath: string;
  size: number;
  toolName: string;
  timestamp: Date;
}

/**
 * Data Manager for externalizing large data to reduce memory usage.
 */
export class DataManager {
  private dataDir: string;
  private references = new Map<string, DataReference>();

  /**
   * Create a new DataManager instance.
   * @param projectRoot - Project root directory
   */
  constructor(projectRoot: string) {
    this.dataDir = path.join(projectRoot, '.syrin', 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Check if data should be externalized based on size.
   * @param sizeBytes - Size of data in bytes
   * @returns true if data should be externalized
   */
  static shouldExternalize(sizeBytes: number): boolean {
    return sizeBytes > 100 * 1024; // 100KB threshold
  }

  /**
   * Store large data to disk and return a reference ID.
   * @param data - Data to store
   * @param toolName - Name of the tool that generated the data
   * @returns Reference ID for the stored data
   */
  store(data: unknown, toolName: string): string {
    const id = `data-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const filePath = saveJSONToFile(data, toolName, this.dataDir);

    const stats = fs.statSync(filePath);
    const ref: DataReference = {
      id,
      filePath,
      size: stats.size,
      toolName,
      timestamp: new Date(),
    };

    this.references.set(id, ref);
    return id;
  }

  /**
   * Load data by reference ID.
   * @param id - Reference ID
   * @returns The stored data
   */
  load(id: string): unknown {
    const ref = this.references.get(id);
    if (!ref) {
      throw new Error(`Data reference not found: ${id}`);
    }

    const content = fs.readFileSync(ref.filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get reference metadata without loading the actual data.
   * @param id - Reference ID
   * @returns Reference metadata or undefined if not found
   */
  getReference(id: string): DataReference | undefined {
    return this.references.get(id);
  }

  /**
   * Format file size for display.
   * @param sizeBytes - Size in bytes
   * @returns Formatted size string
   */
  static formatSize(sizeBytes: number): string {
    const sizeKB = sizeBytes / 1024;
    const sizeMB = sizeKB / 1024;
    if (sizeMB >= 1) {
      return `${sizeMB.toFixed(2)}MB`;
    }
    return `${sizeKB.toFixed(2)}KB`;
  }
}
