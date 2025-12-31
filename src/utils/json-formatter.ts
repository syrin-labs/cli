/**
 * JSON formatting utilities for displaying large JSON data efficiently.
 * Provides tree view formatting and pagination for arrays.
 */

export interface JSONTreeOptions {
  /** Maximum depth to expand by default */
  maxDepth?: number;
  /** Maximum items to show in arrays before pagination */
  maxArrayItems?: number;
  /** Items per page for pagination */
  itemsPerPage?: number;
  /** Current page for pagination (0-indexed) */
  currentPage?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Indentation string */
  indent?: string;
}

export interface JSONTreeNode {
  key?: string;
  value: unknown;
  type: 'object' | 'array' | 'primitive';
  expanded: boolean;
  children?: JSONTreeNode[];
  /** For arrays: total count and pagination info */
  arrayInfo?: {
    total: number;
    start: number;
    end: number;
    currentPage: number;
    totalPages: number;
  };
}

/**
 * Convert JSON value to tree structure with pagination support.
 */
export function jsonToTree(
  data: unknown,
  options: JSONTreeOptions = {}
): JSONTreeNode {
  const {
    maxDepth = 3,
    maxArrayItems = 50,
    itemsPerPage = 20,
    currentPage = 0,
  } = options;

  function buildNode(
    value: unknown,
    depth: number,
    key?: string
  ): JSONTreeNode {
    if (value === null) {
      return {
        key,
        value: null,
        type: 'primitive',
        expanded: depth < maxDepth,
      };
    }

    if (Array.isArray(value)) {
      const total = value.length;
      const totalPages = Math.ceil(total / itemsPerPage);
      const start = currentPage * itemsPerPage;
      const end = Math.min(start + itemsPerPage, total);
      const paginatedItems = value.slice(start, end);

      return {
        key,
        value: paginatedItems,
        type: 'array',
        expanded: depth < maxDepth && total <= maxArrayItems,
        arrayInfo: {
          total,
          start: start + 1, // 1-indexed for display
          end,
          currentPage,
          totalPages,
        },
        children:
          depth < maxDepth && total <= maxArrayItems
            ? paginatedItems.map((item, idx) =>
                buildNode(item, depth + 1, `[${start + idx}]`)
              )
            : undefined,
      };
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      const expanded = depth < maxDepth;

      return {
        key,
        value: obj,
        type: 'object',
        expanded,
        children: expanded
          ? keys.map(k => buildNode(obj[k], depth + 1, k))
          : undefined,
      };
    }

    // Primitive value
    return {
      key,
      value,
      type: 'primitive',
      expanded: true,
    };
  }

  return buildNode(data, 0);
}

/**
 * Format JSON tree as a string with tree structure.
 */
export function formatJSONTree(
  node: JSONTreeNode,
  options: JSONTreeOptions = {}
): string {
  const { showLineNumbers = false } = options;
  const lines: string[] = [];
  let lineNumber = 1;

  function formatNode(
    node: JSONTreeNode,
    prefix: string,
    isLast: boolean,
    depth: number
  ): void {
    const connector = isLast ? '└─' : '├─';
    const nextPrefix = isLast ? '   ' : '│  ';

    // Format key
    if (node.key !== undefined) {
      const keyPart = `${prefix}${connector} ${node.key}: `;
      const lineNum = showLineNumbers ? `${lineNumber++}. `.padStart(6) : '';
      lines.push(`${lineNum}${keyPart}`);
    }

    // Format value based on type
    if (node.type === 'primitive') {
      const valueStr = formatPrimitive(node.value);
      const lastLine = lines[lines.length - 1] || '';
      if (lastLine.includes(':')) {
        lines[lines.length - 1] = lastLine + valueStr;
      } else {
        lines.push(`${prefix}${connector} ${valueStr}`);
      }
    } else if (node.type === 'array') {
      const arrayInfo = node.arrayInfo;
      if (arrayInfo && arrayInfo.total > arrayInfo.end - arrayInfo.start + 1) {
        // Paginated array
        const info = `[Array: ${arrayInfo.total} items, showing ${arrayInfo.start}-${arrayInfo.end} (page ${arrayInfo.currentPage + 1}/${arrayInfo.totalPages})]`;
        const lastLine = lines[lines.length - 1] || '';
        if (lastLine.includes(':')) {
          lines[lines.length - 1] = lastLine + info;
        } else {
          lines.push(`${prefix}${connector} ${info}`);
        }
      } else {
        const lastLine = lines[lines.length - 1] || '';
        if (lastLine.includes(':')) {
          lines[lines.length - 1] =
            lastLine + `[Array: ${arrayInfo?.total || 0} items]`;
        }
      }

      if (node.expanded && node.children) {
        node.children.forEach((child, idx) => {
          const isLastChild = idx === node.children!.length - 1;
          formatNode(
            child,
            prefix + (node.key !== undefined ? nextPrefix : ''),
            isLastChild,
            depth + 1
          );
        });
      } else if (!node.expanded && arrayInfo) {
        lines.push(
          `${prefix}${nextPrefix}... (${arrayInfo.total} items, use /expand to view)`
        );
      }
    } else if (node.type === 'object') {
      const obj = node.value as Record<string, unknown>;
      const keyCount = Object.keys(obj).length;
      const lastLine = lines[lines.length - 1] || '';
      if (lastLine.includes(':')) {
        lines[lines.length - 1] = lastLine + `{Object: ${keyCount} keys}`;
      }

      if (node.expanded && node.children) {
        node.children.forEach((child, idx) => {
          const isLastChild = idx === node.children!.length - 1;
          formatNode(
            child,
            prefix + (node.key !== undefined ? nextPrefix : ''),
            isLastChild,
            depth + 1
          );
        });
      } else if (!node.expanded) {
        lines.push(
          `${prefix}${nextPrefix}... (${keyCount} keys, use /expand to view)`
        );
      }
    }
  }

  formatNode(node, '', true, 0);
  return lines.join('\n');
}

/**
 * Format primitive value for display.
 */
function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return `"${value.substring(0, 97)}..." (${value.length} chars)`;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'object' && value !== null) {
    // For objects, show a summary instead of stringifying
    return '[Object]';
  }
  // Fallback for any other types
  return '[Unknown]';
}

/**
 * Format JSON with pagination for large arrays.
 * Returns formatted string with pagination info.
 */
export function formatJSONWithPagination(
  data: unknown,
  options: JSONTreeOptions = {}
): string {
  const tree = jsonToTree(data, options);
  return formatJSONTree(tree, options);
}

/**
 * Get summary information about JSON structure.
 * Optimized to avoid expensive stringification for large data.
 */
export function getJSONSummary(data: unknown): {
  type: string;
  size: number;
  itemCount?: number;
  keyCount?: number;
  depth: number;
  hasLargeArrays: boolean;
} {
  // Fast size estimation without full stringification for large data
  let size: number;
  try {
    // For small data, use actual stringification
    // For large data, estimate to avoid blocking
    if (typeof data === 'string') {
      size = Buffer.byteLength(data, 'utf8');
    } else {
      // Quick check: if it's a large array/object, estimate instead
      const isLarge =
        (Array.isArray(data) && data.length > 1000) ||
        (typeof data === 'object' &&
          data !== null &&
          !Array.isArray(data) &&
          Object.keys(data as Record<string, unknown>).length > 100);

      if (isLarge) {
        // Estimate size without full stringification
        // Create a small sample by taking a slice/portion of the data
        let sample: unknown;
        if (Array.isArray(data)) {
          // Sample first 10 items
          sample = data.slice(0, 10);
        } else {
          // Sample first 10 keys
          const keys = Object.keys(data as Record<string, unknown>).slice(
            0,
            10
          );
          sample = Object.fromEntries(
            keys.map(key => [key, (data as Record<string, unknown>)[key]])
          );
        }
        const sampleString = JSON.stringify(sample);
        const estimatedSizePerChar =
          Buffer.byteLength(sampleString, 'utf8') / sampleString.length;
        const estimatedChars = estimateObjectSize(data);
        size = Math.floor(estimatedChars * estimatedSizePerChar);
      } else {
        // Small data: use actual stringification
        const jsonString = JSON.stringify(data);
        size = Buffer.byteLength(jsonString, 'utf8');
      }
    }
  } catch {
    // Fallback: estimate
    size = estimateObjectSize(data) * 2; // Rough estimate
  }

  function analyze(
    value: unknown,
    depth: number
  ): {
    maxDepth: number;
    itemCount: number;
    keyCount: number;
    hasLargeArrays: boolean;
  } {
    if (value === null || typeof value !== 'object') {
      return {
        maxDepth: depth,
        itemCount: 0,
        keyCount: 0,
        hasLargeArrays: false,
      };
    }

    if (Array.isArray(value)) {
      const itemCount = value.length;
      let maxDepth = depth;
      let totalKeys = 0;
      let hasLargeArrays = itemCount > 100;

      for (const item of value.slice(0, 10)) {
        // Sample first 10 items
        const result = analyze(item, depth + 1);
        maxDepth = Math.max(maxDepth, result.maxDepth);
        totalKeys += result.keyCount;
        hasLargeArrays = hasLargeArrays || result.hasLargeArrays;
      }

      return {
        maxDepth,
        itemCount,
        keyCount: totalKeys,
        hasLargeArrays,
      };
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    let maxDepth = depth;
    let totalItems = 0;
    let totalKeys = keys.length;
    let hasLargeArrays = false;

    for (const key of keys) {
      const result = analyze(obj[key], depth + 1);
      maxDepth = Math.max(maxDepth, result.maxDepth);
      totalItems += result.itemCount;
      totalKeys += result.keyCount;
      hasLargeArrays = hasLargeArrays || result.hasLargeArrays;
    }

    return {
      maxDepth,
      itemCount: totalItems,
      keyCount: totalKeys,
      hasLargeArrays,
    };
  }

  const analysis = analyze(data, 0);
  const type = Array.isArray(data)
    ? 'array'
    : typeof data === 'object' && data !== null
      ? 'object'
      : typeof data;

  return {
    type,
    size,
    itemCount: Array.isArray(data) ? data.length : analysis.itemCount,
    keyCount:
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? Object.keys(data as Record<string, unknown>).length
        : undefined,
    depth: analysis.maxDepth,
    hasLargeArrays:
      analysis.hasLargeArrays || (Array.isArray(data) && data.length > 100),
  };
}

/**
 * Estimate object size without full stringification (much faster for large objects).
 */
function estimateObjectSize(obj: unknown): number {
  if (obj === null || obj === undefined) return 4; // "null"
  if (typeof obj === 'string') return obj.length + 2; // quotes
  if (typeof obj === 'number') return 10; // average number length
  if (typeof obj === 'boolean') return 5; // "true"/"false"
  if (Array.isArray(obj)) {
    // Estimate: brackets + commas + items
    let size = 2; // brackets
    for (let i = 0; i < Math.min(obj.length, 100); i++) {
      // Sample first 100 items
      size += estimateObjectSize(obj[i]) + 1; // +1 for comma
    }
    if (obj.length > 100) {
      // Extrapolate for remaining items
      const avgItemSize = size / Math.min(obj.length, 100);
      size += (obj.length - 100) * avgItemSize;
    }
    return size;
  }
  if (typeof obj === 'object') {
    const SAMPLE_LIMIT = 100;
    const keys = Object.keys(obj as Record<string, unknown>);
    const sampleCount = Math.min(keys.length, SAMPLE_LIMIT);
    let accumulatedSize = 0;

    // Sample first sampleCount keys
    for (let i = 0; i < sampleCount; i++) {
      const key = keys[i]!; // Safe: i < sampleCount <= keys.length
      accumulatedSize += key.length + 3; // key + quotes + colon
      accumulatedSize +=
        estimateObjectSize((obj as Record<string, unknown>)[key]) + 1; // +1 for comma
    }

    // If all keys were sampled, return exact size
    if (sampleCount === keys.length) {
      return 2 + accumulatedSize; // +2 for braces
    }

    // Extrapolate for remaining keys
    const extrapolatedSize = accumulatedSize * (keys.length / sampleCount);
    return 2 + extrapolatedSize; // +2 for braces
  }
  return 10; // fallback estimate
}
