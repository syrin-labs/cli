/**
 * List type constants.
 */

export const ListTypes = {
  TOOLS: 'tools',
  RESOURCES: 'resources',
  PROMPTS: 'prompts',
} as const;

export type ListType = (typeof ListTypes)[keyof typeof ListTypes];
