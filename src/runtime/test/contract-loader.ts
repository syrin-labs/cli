/**
 * Contract file loader.
 * Loads and parses tool contract YAML files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { ZodError } from 'zod';
import { validateContract } from './contract-schema';
import type { ParsedContract } from './contract-types';
import { ConfigurationError } from '@/utils/errors';

/**
 * Load a contract from a YAML file.
 * @param filePath - Path to the contract YAML file
 * @returns Parsed contract with metadata
 * @throws {ConfigurationError} If file is missing or invalid
 */
export function loadContract(filePath: string): ParsedContract {
  try {
    // Read and parse YAML file (removes TOCTOU risk by combining read + parse in try-catch)
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const contractData = load(fileContent);

    if (!contractData || typeof contractData !== 'object') {
      throw new ConfigurationError(
        `Contract file is empty or invalid: ${filePath}`,
        {
          context: { filePath },
        }
      );
    }

    // Validate contract schema
    const validatedContract = validateContract(contractData);

    // Extract metadata
    const directory = path.dirname(filePath);
    const toolName = validatedContract.tool;

    return {
      ...validatedContract,
      filePath,
      directory,
      toolName,
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    // Handle file system errors (file not found, permission denied, etc.)
    if (error && typeof error === 'object' && 'code' in error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ENOENT') {
        throw new ConfigurationError(`Contract file not found: ${filePath}`, {
          context: { filePath },
          cause: error instanceof Error ? error : undefined,
        });
      }
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      throw new ConfigurationError(
        `Invalid contract schema in ${filePath}: ${error.message}`,
        {
          cause: error,
          context: { filePath },
        }
      );
    }

    throw new ConfigurationError(
      `Failed to load contract from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { filePath },
      }
    );
  }
}

/**
 * Discover all contract files in a directory (recursively).
 * @param toolsDir - Directory containing contract files
 * @returns Array of contract file paths
 * @throws {ConfigurationError} If directory doesn't exist
 */
export function discoverContractFiles(toolsDir: string): string[] {
  // Check if directory exists
  if (!fs.existsSync(toolsDir)) {
    throw new ConfigurationError(
      `Tools directory not found: ${toolsDir}. Create it and add tool contract files (tools/<tool-name>.yaml)`,
      {
        context: { toolsDir },
      }
    );
  }

  if (!fs.statSync(toolsDir).isDirectory()) {
    throw new ConfigurationError(`Path is not a directory: ${toolsDir}`, {
      context: { toolsDir },
    });
  }

  const contractFiles: string[] = [];

  /**
   * Recursively find all .yaml files in directory.
   */
  function findYamlFiles(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        findYamlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        contractFiles.push(fullPath);
      }
    }
  }

  findYamlFiles(toolsDir);

  return contractFiles.sort(); // Sort for consistent ordering
}

/**
 * Load all contracts from a tools directory.
 * @param toolsDir - Directory containing contract files
 * @returns Array of parsed contracts
 * @throws {ConfigurationError} If directory doesn't exist or contracts are invalid
 */
export function loadAllContracts(toolsDir: string): ParsedContract[] {
  const contractFiles = discoverContractFiles(toolsDir);

  if (contractFiles.length === 0) {
    throw new ConfigurationError(
      `No contract files found in ${toolsDir}. Add tool contract files (tools/<tool-name>.yaml)`,
      {
        context: { toolsDir },
      }
    );
  }

  const contracts: ParsedContract[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const filePath of contractFiles) {
    try {
      const contract = loadContract(filePath);
      contracts.push(contract);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({ file: filePath, error: errorMessage });
    }
  }

  if (errors.length > 0) {
    const errorMessages = errors
      .map(e => `  - ${e.file}: ${e.error}`)
      .join('\n');
    throw new ConfigurationError(
      `Failed to load ${errors.length} contract file(s):\n${errorMessages}`,
      {
        context: { toolsDir, errors },
      }
    );
  }

  return contracts;
}

/**
 * Match tool name to contract file.
 * Extracts tool name from filename regardless of directory depth.
 * @param filePath - Path to contract file
 * @returns Tool name extracted from filename
 */
export function extractToolNameFromPath(filePath: string): string {
  const filename = path.basename(filePath, '.yaml');
  return filename;
}

/**
 * Find contract for a specific tool name.
 * @param contracts - Array of parsed contracts
 * @param toolName - Tool name to find
 * @returns Contract for the tool, or undefined if not found
 */
export function findContractForTool(
  contracts: ParsedContract[],
  toolName: string
): ParsedContract | undefined {
  return contracts.find(contract => contract.tool === toolName);
}
