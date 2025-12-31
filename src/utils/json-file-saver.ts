/**
 * Utilities for saving large JSON data to external files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Save JSON data to a file.
 * Returns the file path.
 */
export function saveJSONToFile(
  data: unknown,
  toolName: string,
  outputDir?: string
): string {
  const dir = outputDir || path.join(os.tmpdir(), 'syrin-json-exports');

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${toolName}-${timestamp}.json`;
  const filePath = path.join(dir, filename);

  // Write JSON with pretty formatting
  const jsonString = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, jsonString, 'utf-8');

  return filePath;
}

/**
 * Get the size of a file in human-readable format.
 */
export function getFileSize(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return 'unknown';
  }
}

/**
 * Format a file path for display (shorten if too long).
 */
export function formatFilePath(
  filePath: string,
  maxLength: number = 60
): string {
  if (filePath.length <= maxLength) return filePath;

  // Try to show just the filename
  const filename = path.basename(filePath);
  if (filename.length <= maxLength) return filename;

  // Truncate filename
  return `...${filename.slice(-(maxLength - 3))}`;
}
