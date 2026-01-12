/**
 * Syrin external links constants.
 * Centralized URLs for npm, GitHub, and documentation.
 */

import { PACKAGE_NAME } from './app';

export const SYRIN_LINKS = {
  NPM: `https://www.npmjs.com/package/${PACKAGE_NAME}`,
  GITHUB: 'https://github.com/syrin-labs/cli',
  DOCS: 'https://github.com/syrin-labs/cli#readme',
} as const;
