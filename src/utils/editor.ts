/**
 * Editor utility for opening files in system editor.
 * Supports nano (Unix) and notepad (Windows).
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * Get the appropriate editor command for the current platform.
 * Checks EDITOR and VISUAL environment variables first, then falls back to platform defaults.
 * @returns Editor command
 */
export function getEditor(): string {
  // Check environment variables first (user preference)
  if (process.env.EDITOR && process.env.EDITOR.trim() !== '') {
    return process.env.EDITOR.trim();
  }
  if (process.env.VISUAL && process.env.VISUAL.trim() !== '') {
    return process.env.VISUAL.trim();
  }

  // Fall back to platform defaults
  if (process.platform === 'win32') {
    return 'notepad';
  }
  return 'nano';
}

/**
 * Get editor arguments for opening a file.
 * @param editor - Editor command
 * @param filePath - Path to file to open
 * @returns Array of arguments for the editor
 */
function getEditorArgs(editor: string, filePath: string): string[] {
  // For notepad and nano, just pass the file path
  return [filePath];
}

/**
 * Check file permissions and return security status.
 * @param filePath - Path to file to check
 * @returns Permission check result
 */
export function checkFilePermissions(filePath: string): {
  isSecure: boolean;
  currentMode: string;
  recommendedMode: string;
} {
  if (!fs.existsSync(filePath)) {
    return {
      isSecure: true, // Non-existent files are considered secure
      currentMode: 'N/A',
      recommendedMode: '600',
    };
  }

  try {
    const stats = fs.statSync(filePath);
    // Normalize octal string to 3 digits for consistent comparison
    const mode = stats.mode.toString(8).slice(-3).padStart(3, '0');
    const isSecure = mode === '600' || mode === '400'; // Read/write owner only, or read-only owner

    return {
      isSecure,
      currentMode: mode,
      recommendedMode: '600',
    };
  } catch {
    // If we can't check permissions, assume insecure
    return {
      isSecure: false,
      currentMode: 'unknown',
      recommendedMode: '600',
    };
  }
}

/**
 * Ensure a file exists, creating it with a template if needed.
 * @param filePath - Path to file
 * @param template - Template content to use if file doesn't exist
 * @param secure - Whether to set secure permissions (default: true for .env files)
 */
export function ensureFileExists(
  filePath: string,
  template: string,
  secure: boolean = true
): void {
  if (fs.existsSync(filePath)) {
    return;
  }

  // Create directory if needed
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Create file with template
  fs.writeFileSync(filePath, template, 'utf-8');

  // Set secure permissions if requested
  if (secure) {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Ignore permission errors (may not work on all systems)
    }
  }
}

/**
 * Open a file in the system editor.
 * @param filePath - Path to file to open
 * @param createIfMissing - Whether to create file if it doesn't exist (default: false)
 * @param template - Template content if creating file (optional)
 * @returns Promise that resolves when editor closes
 * @throws {Error} If editor fails to open
 */
export async function openInEditor(
  filePath: string,
  createIfMissing: boolean = false,
  template?: string
): Promise<void> {
  // Ensure file exists if requested
  if (createIfMissing && !fs.existsSync(filePath) && template) {
    ensureFileExists(filePath, template, filePath.endsWith('.env'));
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const editor = getEditor();
  const args = getEditorArgs(editor, filePath);

  return new Promise((resolve, reject) => {
    const proc = spawn(editor, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('exit', code => {
      if (code === 0 || code === null) {
        // Exit code 0 or null (normal exit) - user saved and closed
        resolve();
      } else {
        // Non-zero exit code - might be user cancellation or error
        // We'll treat it as success (user may have cancelled, which is fine)
        resolve();
      }
    });

    proc.on('error', error => {
      reject(
        new Error(
          `Failed to open editor "${editor}": ${error.message}. Make sure the editor is installed and available in your PATH.`
        )
      );
    });
  });
}
