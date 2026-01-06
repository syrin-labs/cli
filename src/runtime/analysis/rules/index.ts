/**
 * Rule registry.
 * Exports all analysis rules.
 */

import type { Rule } from './base';

// Error rules (will be imported as we create them)
import { E001MissingOutputSchema } from './errors/e001-missing-output-schema';
import { E002UnderspecifiedRequiredInput } from './errors/e002-underspecified-input';
import { E003TypeMismatch } from './errors/e003-type-mismatch';
import { E004FreeTextPropagation } from './errors/e004-free-text-propagation';
import { E005ToolAmbiguity } from './errors/e005-tool-ambiguity';
import { E006ParamNotInDescription } from './errors/e006-param-not-in-description';
import { E007OutputNotGuaranteed } from './errors/e007-output-not-guaranteed';
import { E008CircularDependency } from './errors/e008-circular-dependency';
import { E009ImplicitUserInput } from './errors/e009-implicit-user-input';
import { E010NonSerializable } from './errors/e010-non-serializable';
import { E011MissingToolDescription } from './errors/e011-missing-tool-description';

// Warning rules
import { W001ImplicitDependency } from './warnings/w001-implicit-dependency';
import { W002FreeTextWithoutNormalization } from './warnings/w002-free-text-without-normalization';
import { W003MissingExamples } from './warnings/w003-missing-examples';
import { W004OverloadedResponsibility } from './warnings/w004-overloaded-responsibility';
import { W005GenericDescription } from './warnings/w005-generic-description';
import { W006OptionalAsRequired } from './warnings/w006-optional-as-required';
import { W007BroadOutputSchema } from './warnings/w007-broad-output-schema';
import { W008MultipleEntryPoints } from './warnings/w008-multiple-entry-points';
import { W009HiddenSideEffects } from './warnings/w009-hidden-side-effects';
import { W010OutputNotReusable } from './warnings/w010-output-not-reusable';

/**
 * All registered rules.
 */
export const ALL_RULES: Rule[] = [
  // Error rules (blocking)
  E001MissingOutputSchema,
  E002UnderspecifiedRequiredInput,
  E003TypeMismatch,
  E004FreeTextPropagation,
  E005ToolAmbiguity,
  E006ParamNotInDescription,
  E007OutputNotGuaranteed,
  E008CircularDependency,
  E009ImplicitUserInput,
  E010NonSerializable,
  E011MissingToolDescription,
  // Warning rules (non-blocking)
  W001ImplicitDependency,
  W002FreeTextWithoutNormalization,
  W003MissingExamples,
  W004OverloadedResponsibility,
  W005GenericDescription,
  W006OptionalAsRequired,
  W007BroadOutputSchema,
  W008MultipleEntryPoints,
  W009HiddenSideEffects,
  W010OutputNotReusable,
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
