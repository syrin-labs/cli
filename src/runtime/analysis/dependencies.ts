/**
 * Dependency inference.
 * Infers tool dependencies using deterministic heuristics.
 */

import type { ToolSpec, Dependency, Indexes } from './types';

/**
 * Confidence threshold for dependencies.
 */
const DEPENDENCY_THRESHOLD = 0.6;

/**
 * Calculate name similarity between two strings.
 * Returns a score between 0.0 and 1.0.
 */
function nameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) {
    return 1.0;
  }

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    return 0.8;
  }

  // Partial match (common substring)
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;

  // Check if shorter is a significant substring of longer
  if (longer.includes(shorter) && shorter.length >= 3) {
    return 0.7;
  }

  // Word overlap
  const words1 = new Set(n1.split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(n2.split(/\W+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) {
    return 0.0;
  }

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) {
    return 0.0;
  }

  return intersection.size / union.size;
}

/**
 * Check if two types are compatible.
 */
function typeCompatible(fromType: string, toType: string): number {
  // Exact match
  if (fromType === toType) {
    return 0.3;
  }

  // Compatible types
  const compatiblePairs: Array<[string, string]> = [
    ['string', 'string'],
    ['number', 'string'],
    ['integer', 'string'],
    ['string', 'enum'],
    ['array', 'string'],
    ['object', 'string'],
  ];

  for (const [from, to] of compatiblePairs) {
    if (fromType === from && (toType === to || toType === 'string')) {
      return 0.2;
    }
  }

  // Incompatible
  if (
    (fromType === 'string' && toType === 'number') ||
    (fromType === 'number' && toType === 'boolean')
  ) {
    return -0.5;
  }

  return 0.0;
}

/**
 * Calculate description token overlap.
 */
function descriptionOverlap(
  tokens1: Set<string>,
  tokens2: Set<string>
): number {
  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0.0;
  }

  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) {
    return 0.0;
  }

  return (intersection.size / union.size) * 0.3;
}

/**
 * Infer dependencies between tools.
 */
export function inferDependencies(
  tools: ToolSpec[],
  _indexes: Indexes
): Dependency[] {
  const dependencies: Dependency[] = [];

  for (const toTool of tools) {
    for (const toField of toTool.inputs) {
      // Check all output fields from all tools
      for (const fromTool of tools) {
        if (fromTool.name === toTool.name) {
          continue; // Skip same tool
        }

        for (const fromField of fromTool.outputs) {
          // Calculate confidence score
          let confidence = 0.0;

          // Name similarity (weight: 0.4)
          const nameSim = nameSimilarity(fromField.name, toField.name);
          confidence += nameSim * 0.4;

          // Type compatibility (weight: 0.3)
          const typeCompat = typeCompatible(fromField.type, toField.type);
          if (typeCompat > 0) {
            confidence += typeCompat;
          } else if (typeCompat < 0) {
            confidence += typeCompat; // Penalty for incompatible types
          }

          // Description token overlap (weight: 0.3)
          const descOverlap = descriptionOverlap(
            fromTool.descriptionTokens,
            toTool.descriptionTokens
          );
          confidence += descOverlap;

          // Clamp confidence to [0.0, 1.0]
          confidence = Math.max(0.0, Math.min(1.0, confidence));

          // Only include if above threshold
          if (confidence >= DEPENDENCY_THRESHOLD) {
            dependencies.push({
              fromTool: fromTool.name,
              fromField: fromField.name,
              toTool: toTool.name,
              toField: toField.name,
              confidence,
            });
          }
        }
      }
    }
  }

  return dependencies;
}
