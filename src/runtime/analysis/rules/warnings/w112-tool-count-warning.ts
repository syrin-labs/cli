/**
 * W112: Tool Count Warning
 *
 * Condition:
 * - Server has more than 20 tools
 *
 * Why:
 * - Research shows LLM accuracy degrades with >20 tools
 * - Causes context bloat and selection confusion
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';

const TOOL_COUNT_THRESHOLD = 20;

class W112ToolCountWarningRule extends BaseRule {
  readonly id = 'W112';
  readonly severity = 'warning' as const;
  readonly ruleName = 'Tool Count Warning';
  readonly description = `Server has more than ${TOOL_COUNT_THRESHOLD} tools which may cause LLM accuracy degradation.`;

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const toolCount = ctx.tools.length;

    if (toolCount > TOOL_COUNT_THRESHOLD) {
      diagnostics.push(
        this.createDiagnostic(
          `Server has ${toolCount} tools (threshold: ${TOOL_COUNT_THRESHOLD}). LLM accuracy may degrade with too many tools.`,
          undefined,
          undefined,
          `Consider splitting into multiple specialized servers or organizing tools into clear categories.`
        )
      );
    }

    return diagnostics;
  }
}

export const W112ToolCountWarning = new W112ToolCountWarningRule();
