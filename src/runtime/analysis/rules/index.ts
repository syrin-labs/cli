/**
 * Rule registry.
 * Exports all analysis rules.
 *
 * ## Rule Categories
 *
 * Rules are organized into two categories:
 *
 * ### Static Analysis Rules
 * These rules run during `syrin analyse` and check tool contracts without execution.
 * Examples: E100 (missing output schema), E103 (type mismatch), W105 (optional as required).
 *
 * ### Behavioral Analysis Rules (v1.3.0+)
 * These rules run during `syrin test` and check tool behavior at runtime.
 * Their `check()` method returns `[]` (no static diagnostics) because they require:
 * - Actual tool execution
 * - I/O monitoring (stdout/stderr)
 * - Memory/CPU analysis
 * - Determinism testing
 *
 * Behavioral rules implement `checkWithBehavioralContext()` that is called by the test orchestrator.
 *
 * **List of behavioral-only rules (11 total):**
 * - E000: Tool Not Found (requires runtime context: tool not in MCP server)
 * - E200: Input Validation Failed (requires test execution to detect)
 * - E300: Output Validation Failed (requires behavioral context)
 * - E301: Output Explosion (requires I/O monitoring)
 * - E400: Tool Execution Failed (requires tool to actually run)
 * - E403: Unbounded Execution (requires runtime timeout detection)
 * - E501: Hidden Dependency (requires behavioral analysis)
 * - E600: Unexpected Test Result (requires test comparison)
 * - W110: Weak Schema (requires behavioral schema comparison)
 * - W300: High Entropy Output (requires entropy analysis of outputs)
 * - W301: Unstable Defaults (requires multiple execution runs)
 *
 * This pattern allows gradual feature addition: rules can start as "static stubs"
 * and gain behavioral implementations as test infrastructure matures.
 */

import type { Rule } from './base';

// Error rules (will be imported as we create them)
import { E000ToolNotFound } from './errors/e000-tool-not-found';
import { E100MissingOutputSchema } from './errors/e100-missing-output-schema';
import { E102UnderspecifiedRequiredInput } from './errors/e102-underspecified-input';
import { E103TypeMismatch } from './errors/e103-type-mismatch';
import { E105FreeTextPropagation } from './errors/e105-free-text-propagation';
import { E110ToolAmbiguity } from './errors/e110-tool-ambiguity';
import { E104ParamNotInDescription } from './errors/e104-param-not-in-description';
import { E106OutputNotGuaranteed } from './errors/e106-output-not-guaranteed';
import { E107CircularDependency } from './errors/e107-circular-dependency';
import { E108ImplicitUserInput } from './errors/e108-implicit-user-input';
import { E109NonSerializable } from './errors/e109-non-serializable';
import { E101MissingToolDescription } from './errors/e101-missing-tool-description';
import { E500SideEffectDetected } from './errors/e500-side-effect-detected';
import { E301OutputExplosion } from './errors/e301-output-explosion';
import { E501HiddenDependency } from './errors/e501-hidden-dependency';
import { E403UnboundedExecution } from './errors/e403-unbounded-execution';
import { E300OutputValidationFailed } from './errors/e300-output-validation-failed';
import { E200InputValidationFailed } from './errors/e200-input-validation-failed';
import { E400ToolExecutionFailed } from './errors/e400-tool-execution-failed';
import { E600UnexpectedTestResult } from './errors/e600-unexpected-test-result';

// Warning rules
import { W100ImplicitDependency } from './warnings/w100-implicit-dependency';
import { W101FreeTextWithoutNormalization } from './warnings/w101-free-text-without-normalization';
import { W102MissingExamples } from './warnings/w102-missing-examples';
import { W103OverloadedResponsibility } from './warnings/w103-overloaded-responsibility';
import { W104GenericDescription } from './warnings/w104-generic-description';
import { W105OptionalAsRequired } from './warnings/w105-optional-as-required';
import { W106BroadOutputSchema } from './warnings/w106-broad-output-schema';
import { W107MultipleEntryPoints } from './warnings/w107-multiple-entry-points';
import { W108HiddenSideEffects } from './warnings/w108-hidden-side-effects';
import { W109OutputNotReusable } from './warnings/w109-output-not-reusable';
import { W110WeakSchema } from './warnings/w110-weak-schema';
import { W111DescriptionQuality } from './warnings/w111-description-quality';
import { W112ToolCountWarning } from './warnings/w112-tool-count-warning';
import { W113OptionalDefaults } from './warnings/w113-optional-defaults';
import { W114SchemaDepth } from './warnings/w114-schema-depth';
import { W115TokenCost } from './warnings/w115-token-cost';
import { W116SchemaDescriptionDrift } from './warnings/w116-schema-description-drift';
import { W117IdempotencySignal } from './warnings/w117-idempotency-signal';
import { W300HighEntropyOutput } from './warnings/w300-high-entropy-output';
import { W301UnstableDefaults } from './warnings/w301-unstable-defaults';
import { E112SensitiveParams } from './errors/e112-sensitive-params';
import { E113DuplicateNames } from './errors/e113-duplicate-names';

/**
 * All registered rules.
 */
export const ALL_RULES: Rule[] = [
  // Error rules (blocking)
  E000ToolNotFound,
  E100MissingOutputSchema,
  E102UnderspecifiedRequiredInput,
  E103TypeMismatch,
  E105FreeTextPropagation,
  E110ToolAmbiguity,
  E104ParamNotInDescription,
  E106OutputNotGuaranteed,
  E107CircularDependency,
  E108ImplicitUserInput,
  E109NonSerializable,
  E101MissingToolDescription,
  // Behavioral error rules (v1.3.0)
  E500SideEffectDetected,
  E301OutputExplosion,
  E501HiddenDependency,
  E403UnboundedExecution,
  E300OutputValidationFailed,
  E200InputValidationFailed,
  E400ToolExecutionFailed,
  E600UnexpectedTestResult,
  // Security rules (v1.6.0)
  E112SensitiveParams,
  E113DuplicateNames,
  // Warning rules (non-blocking)
  W100ImplicitDependency,
  W101FreeTextWithoutNormalization,
  W102MissingExamples,
  W103OverloadedResponsibility,
  W104GenericDescription,
  W105OptionalAsRequired,
  W106BroadOutputSchema,
  W107MultipleEntryPoints,
  W108HiddenSideEffects,
  W109OutputNotReusable,
  // Quality rules (v1.6.0)
  W111DescriptionQuality,
  W112ToolCountWarning,
  W113OptionalDefaults,
  W114SchemaDepth,
  W115TokenCost,
  W116SchemaDescriptionDrift,
  W117IdempotencySignal,
  // Behavioral warning rules (v1.3.0)
  W110WeakSchema,
  W300HighEntropyOutput,
  W301UnstableDefaults,
];

/**
 * Get all error rules.
 */
export function getErrorRules(): Rule[] {
  return ALL_RULES.filter(rule => rule.severity === 'error');
}

/**
 * Get all warning rules.
 */
export function getWarningRules(): Rule[] {
  return ALL_RULES.filter(rule => rule.severity === 'warning');
}

/**
 * Filter rules by rule IDs.
 * @param ruleIds - Array of rule IDs to include or exclude
 *                  Prefix with '-' to exclude (e.g., -E100 excludes E100)
 * @returns Filtered array of rules
 */
export function filterRules(ruleIds: string[]): Rule[] {
  if (!ruleIds || ruleIds.length === 0) {
    return ALL_RULES;
  }

  const includeIds: string[] = [];
  const excludeIds: string[] = [];

  for (const id of ruleIds) {
    if (id.startsWith('-')) {
      excludeIds.push(id.slice(1).toUpperCase());
    } else {
      includeIds.push(id.toUpperCase());
    }
  }

  return ALL_RULES.filter(rule => {
    const ruleId = rule.id.toUpperCase();

    // If include list is specified, only include those rules
    if (includeIds.length > 0) {
      return includeIds.includes(ruleId);
    }

    // Otherwise, exclude the specified rules
    return !excludeIds.includes(ruleId);
  });
}
