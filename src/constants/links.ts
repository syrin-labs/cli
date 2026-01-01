/**
 * Syrin external links constants.
 * Centralized URLs for npm, GitHub, and documentation.
 */

import { PACKAGE_NAME } from './app';

export const SYRIN_LINKS = {
  NPM: `https://www.npmjs.com/package/${PACKAGE_NAME}`,
  GITHUB: 'https://github.com/ankan-labs/syrin',
  DOCS: 'https://github.com/ankan-labs/syrin#readme',
} as const;
