#!/usr/bin/env node
/**
 * Syrin main entry point.
 * Exports the CLI runner.
 */

import { run } from './cli';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

// Run CLI when this file is executed directly
// ESM equivalent of require.main === module
const isMainModule = ((): boolean => {
  try {
    if (!process.argv[1]) {
      return false;
    }
    // Resolve symlinks to get the actual file path
    // This is necessary when running via npm global bin symlinks
    const resolvedPath = realpathSync(process.argv[1]);
    return import.meta.url === pathToFileURL(resolvedPath).href;
  } catch {
    return false;
  }
})();

if (isMainModule) {
  run();
}

export { run } from './cli';
export * from './cli';
