#!/usr/bin/env node
/**
 * Syrin main entry point.
 * Exports the CLI runner.
 */

import { run } from './cli';

// Run CLI when this file is executed directly
if (require.main === module) {
  run();
}

export { run } from './cli';
export * from './cli';
