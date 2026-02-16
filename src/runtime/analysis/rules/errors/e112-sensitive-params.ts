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

const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_key',
  'accesskey',
  'private_key',
  'privatekey',
  'auth',
  'credential',
  'pwd',
  'passwd',
];

class E112SensitiveParamsRule extends BaseRule {
  readonly id = 'E112';
  readonly severity = 'error' as const;
  readonly ruleName = 'Security - Sensitive Parameter Detection';
  readonly description =
    'Tool has parameters that may expose sensitive data. Use secure credential references instead.';

  check(ctx: AnalysisContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const tool of ctx.tools) {
      // Check input parameters
      for (const field of tool.inputs) {
        const fieldNameLower = field.name.toLowerCase();

        for (const keyword of SENSITIVE_KEYWORDS) {
          if (fieldNameLower.includes(keyword)) {
            diagnostics.push(
              this.createDiagnostic(
                `Security risk: Parameter "${field.name}" in "${tool.name}" may expose sensitive data.`,
                tool.name,
                field.name,
                `Use a secure credential reference (e.g., "credential_id" pointing to a secrets manager) instead of direct values.`
              )
            );
            break;
          }
        }
      }
    }

    return diagnostics;
  }
}

export const E112SensitiveParams = new E112SensitiveParamsRule();
