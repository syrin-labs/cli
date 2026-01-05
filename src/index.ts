#!/usr/bin/env node
/**
 * Syrin main entry point.
 * Exports the CLI runner.
 */

import { run } from './cli';
import { pathToFileURL } from 'node:url';

// Run CLI when this file is executed directly
// ESM equivalent of require.main === module
const isMainModule = ((): boolean => {
  try {
    if (!process.argv[1]) {
      return false;
    }
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMainModule) {
  run();
}

export { run } from './cli';
export * from './cli';
