/**
 * Utilities for managing .gitignore file.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Ensure .gitignore exists and contains the specified pattern.
 * @param projectRoot - Project root directory
 * @param pattern - Pattern to add to .gitignore
 * @returns true if pattern was added, false if it already existed
 */
export async function ensureGitignorePattern(
  projectRoot: string,
  pattern: string
): Promise<boolean> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf-8');
  } catch (error) {
    // File doesn't exist, create it
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }

  // Normalize line endings and split into lines
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim());

  // Check if pattern already exists (exact match or commented out)
  const patternExists = lines.some(
    line =>
      line === pattern || line === `# ${pattern}` || line.endsWith(pattern)
  );

  if (patternExists) {
    return false;
  }

  // Add pattern to .gitignore
  // Add a blank line if file is not empty and doesn't end with newline
  if (content && !content.endsWith('\n')) {
    content += '\n';
  }

  // Add pattern with a comment if file is not empty
  if (content) {
    content += `\n# Syrin event files\n${pattern}\n`;
  } else {
    content = `# Syrin event files\n${pattern}\n`;
  }

  await fs.writeFile(gitignorePath, content, 'utf-8');
  return true;
}
