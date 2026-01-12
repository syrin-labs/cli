/**
 * Rule registry.
 * Exports all analysis rules.
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
import { W300HighEntropyOutput } from './warnings/w300-high-entropy-output';
import { W301UnstableDefaults } from './warnings/w301-unstable-defaults';

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
