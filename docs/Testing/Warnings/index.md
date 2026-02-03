---
title: 'Warning Rules'
description: 'Comprehensive guide to all warning codes and rules in Syrin'
weight: '6'
---

## Proceed with caution

Syrin validates MCP tools against warning rules that identify potential risks and best practice violations. Warnings are **non-blocking** - they indicate issues that should be addressed but don't prevent tool usage.

## Warning Code Categories

Warnings are organized into categories:

- **1xx**: Schema & Contract Warnings (Static Analysis)
- **3xx**: Output Validation Warnings (Runtime Testing)

## Schema & Contract Warnings (Static Analysis)

Warnings found during static analysis of tool contracts and schemas. These are detected without executing tools.

### Documentation & Clarity

#### [W101: Free-Text Output Without Normalization](/testing/warnings/w101-free-text-output-without-normalization/)

Tool returns unconstrained free text. Consider normalizing output.

**Detection**: Static Analysis

#### [W102: Missing Examples for User-Facing Inputs](/testing/warnings/w102-missing-examples-for-user-facing-inputs/)

Tool accepts user-provided input but has no examples. LLM accuracy may be reduced.

**Detection**: Static Analysis

#### [W104: Tool Description Too Generic](/testing/warnings/w104-tool-description-too-generic/)

Description of tool is too generic. LLM cannot discriminate tools.

**Detection**: Static Analysis

### Tool Design & Responsibility

#### [W103: Overloaded Tool Responsibility](/testing/warnings/w103-overloaded-tool-responsibility/)

Tool appears to handle multiple responsibilities. Tool selection becomes unstable.

**Detection**: Static Analysis

#### [W107: Multiple Entry Points for Same Concept](/testing/warnings/w107-multiple-entry-points-for-same-concept/)

Multiple tools capture the same concept. Conflicting sources of truth.

**Detection**: Static Analysis

### Dependencies & Chaining

#### [W100: Implicit Tool Dependency](/testing/warnings/w100-implicit-tool-dependency/)

Tool appears to depend on another tool, but the dependency is implicit.

**Detection**: Static Analysis

#### [W105: Optional Input Used as Required Downstream](/testing/warnings/w105-optional-input-used-as-required-downstream/)

Optional input is treated as required downstream. Hidden contract violation.

**Detection**: Static Analysis

### Schema Quality

#### [W106: Output Schema Too Broad](/testing/warnings/w106-output-schema-too-broad/)

Output schema of tool is too broad. No contract enforcement.

**Detection**: Static Analysis

#### [W110: Weak Schema](/testing/warnings/w110-weak-schema/)

Contract schema is too loose or does not match MCP tool schema structure.

**Detection**: Runtime (Test Execution)

### Side Effects & Behavior

#### [W108: Hidden Side Effects](/testing/warnings/w108-hidden-side-effects/)

Tool appears to have side effects not reflected in schema. Execution surprises.

**Detection**: Static Analysis

#### [W109: Output Not Reusable](/testing/warnings/w109-output-not-reusable/)

Output of tool is not designed for reuse. Limits composability.

**Detection**: Static Analysis

## Output Validation Warnings (Runtime Testing)

Warnings detected during test execution when tools are actually run.

### [W300: High Entropy Output](/testing/warnings/w300-high-entropy-output/)

Tool output has high entropy, making it difficult for LLM to reason about.

**Detection**: Runtime (Test Execution)

### [W301: Unstable Defaults](/testing/warnings/w301-unstable-defaults/)

Tool behavior changes significantly with default values, breaking agent expectations.

**Detection**: Runtime (Test Execution)

## Warning Detection Methods

### Static Analysis

Warnings detected by analyzing tool contracts and schemas without execution:

- W100-W110: Schema & Contract Warnings

These warnings are found by `syrin analyse` and `syrin test`.

### Runtime Testing

Warnings detected by executing tools in sandboxed environments:

- W300-W301: Output Validation Warnings

These warnings are found by `syrin test` during test execution.

## Quick Reference by Category

### Documentation & Clarity

Improve tool documentation and clarity:

- **W101**: Free-Text Output Without Normalization
- **W102**: Missing Examples for User-Facing Inputs
- **W104**: Tool Description Too Generic

### Tool Design & Organization

Improve tool design and organization:

- **W103**: Overloaded Tool Responsibility
- **W107**: Multiple Entry Points for Same Concept

### Dependencies & Chaining

Improve tool dependencies and chaining:

- **W100**: Implicit Tool Dependency
- **W105**: Optional Input Used as Required Downstream

### Schema Quality

Improve schema definitions:

- **W106**: Output Schema Too Broad
- **W110**: Weak Schema

### Behavior & Side Effects

Improve behavior documentation:

- **W108**: Hidden Side Effects
- **W109**: Output Not Reusable

### Output Quality

Improve output predictability:

- **W300**: High Entropy Output
- **W301**: Unstable Defaults

## See Also

- [Error Rules](/errors/) - Blocking issues that must be fixed
- [Writing Test Cases](/testing/writing-test-cases/) - How to write tests
- [Testing Documentation](/testing/) - Complete testing guide
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract documentation
