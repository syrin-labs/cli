/**
 * E112: Security - Sensitive Parameter Detection
 *
 * Condition:
 * - Parameter name contains security-sensitive keywords
 *
 * Why:
 * - Exposing credentials, secrets, tokens via tool parameters is a security risk
 * - MCP tools should use references or secure credential stores
 */

import { BaseRule } from '../base';
import type { AnalysisContext, Diagnostic } from '../../types';
import { isConceptMatch } from '@/runtime/analysis/semantic-embedding';

class E112SensitiveParamsRule extends BaseRule {
  readonly id = 'E112';
  readonly severity = 'error' as const;
  readonly ruleName = 'Security - Sensitive Parameter Detection';
  readonly description =
    'Tool has parameters that may expose sensitive data. Use secure credential references instead.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      for (const field of tool.inputs) {
        const fieldEmbedding = tool.inputEmbeddings?.get(field.name);

        if (isConceptMatch(fieldEmbedding, 'SENSITIVE', 0.45)) {
          diagnostics.push(
            this.createDiagnostic(
              `Security risk: Parameter "${field.name}" in "${tool.name}" may expose sensitive data.`,
              tool.name,
              field.name,
              `Use a secure credential reference (e.g., "credential_id" pointing to a secrets manager) instead of direct values.`
            )
          );
        }
      }
    }

    return diagnostics;
  }
}

export const E112SensitiveParams = new E112SensitiveParamsRule();
