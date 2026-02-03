---
title: 'Error Rules'
description: 'Comprehensive guide to all error codes and rules in Syrin'
weight: '5'
---

## When things go wrong

Syrin validates MCP tools against comprehensive error rules that catch issues before they cause problems in production. Errors are **blocking** - they must be fixed before tools can be safely used.

## Error Code Categories

Errors are organized into categories similar to HTTP status codes:

- **0xx**: Configuration & Setup Errors
- **1xx**: Schema & Contract Errors (Static Analysis)
- **2xx**: Input Validation Errors
- **3xx**: Output Validation Errors
- **4xx**: Execution Errors
- **5xx**: Behavioral Errors (Side Effects & Dependencies)
- **6xx**: Test & Validation Framework Errors

## Error Types in Test Expectations

When writing test cases, you can specify error types in `expect.error.type`. The following error types map to error codes:

| Error Type            | Error Code | Description                                       |
| --------------------- | ---------- | ------------------------------------------------- |
| `input_validation`    | E200       | Tool input doesn't match declared input schema    |
| `output_validation`   | E300       | Tool output doesn't match declared output schema  |
| `execution_error`     | E400       | Tool execution failed due to runtime error        |
| `side_effect`         | E500       | Tool attempted filesystem writes to project files |
| `output_explosion`    | E301       | Tool output exceeds declared size limit           |
| `unbounded_execution` | E403       | Tool execution timed out or failed to terminate   |

## Configuration & Setup Errors

Errors related to configuration, setup, and tool discovery.

### [E000: Tool Not Found](/testing/errors/e000-tool-not-found/)

Tool contract exists but the tool is not registered in the MCP server.

**Detection**: Runtime  
**Category**: Configuration & Setup

## Schema & Contract Errors (Static Analysis)

Errors found during static analysis of tool contracts and schemas. These are detected without executing tools.

### Core Schema Issues

#### [E100: Missing Output Schema](/testing/errors/e100-missing-output-schema/)

Tool does not declare an output schema. Downstream tools cannot safely consume its output.

**Detection**: Static Analysis

#### [E101: Missing Tool Description](/testing/errors/e101-missing-tool-description/)

Tool is missing a description. LLM cannot understand what the tool does.

**Detection**: Static Analysis

#### [E109: Non-Serializable Output](/testing/errors/e109-non-serializable-output/)

Output of tool is not serializable. Breaks MCP contract.

**Detection**: Static Analysis

### Input Specification Issues

#### [E102: Underspecified Required Input](/testing/errors/e102-underspecified-required-input/)

Required parameter is underspecified. LLM may pass invalid or ambiguous values.

**Detection**: Static Analysis

#### [E104: Parameter Not In Description](/testing/errors/e104-parameter-not-in-description/)

Required parameter is not referenced in tool description. LLM may not know parameter exists.

**Detection**: Static Analysis

#### [E108: Implicit User Input](/testing/errors/e108-implicit-user-input/)

Tool depends on implicit user context with no explicit source.

**Detection**: Static Analysis

### Tool Chaining & Dependencies

#### [E103: Type Mismatch](/testing/errors/e103-type-mismatch/)

Output type incompatible with downstream input type. Tool chains will break.

**Detection**: Static Analysis

#### [E105: Free Text Propagation](/testing/errors/e105-free-text-propagation/)

Free-text output is used by another tool. This is unsafe without constraints.

**Detection**: Static Analysis

#### [E106: Output Not Guaranteed](/testing/errors/e106-output-not-guaranteed/)

Output of tool is not guaranteed, but is used by downstream tools without fallback.

**Detection**: Static Analysis

#### [E107: Circular Dependency](/testing/errors/e107-circular-dependency/)

Circular dependency detected between tools. Execution becomes undefined.

**Detection**: Static Analysis

### Tool Ambiguity

#### [E110: Tool Ambiguity](/testing/errors/e110-tool-ambiguity/)

Multiple tools match the same intent. LLM tool selection is ambiguous.

**Detection**: Static Analysis

## Runtime Validation Errors

Errors detected during test execution when tools are actually run.

### Input Validation Errors

#### [E200: Input Validation Failed](/testing/errors/e200-input-validation-failed/)

Tool input doesn't match declared input schema. Tool doesn't handle invalid inputs gracefully.

**Detection**: Runtime (Test Execution)  
**Category**: Input Validation

### Output Validation Errors

#### [E300: Output Validation Failed](/testing/errors/e300-output-validation-failed/)

Tool output doesn't match declared output schema.

**Detection**: Runtime (Test Execution)  
**Category**: Output Validation

#### [E301: Output Explosion](/testing/errors/e301-output-explosion/)

Tool output exceeds declared size limit. Large outputs overwhelm LLM context and break agent reasoning.

**Detection**: Runtime (Test Execution)  
**Category**: Output Validation

### Execution Errors

#### [E400: Tool Execution Failed](/testing/errors/e400-tool-execution-failed/)

Tool raises an exception during execution. Tool should handle errors gracefully instead of crashing.

**Detection**: Runtime (Test Execution)  
**Category**: Execution

#### [E403: Unbounded Execution](/testing/errors/e403-unbounded-execution/)

Tool execution timed out or failed to terminate. Tool may hang indefinitely, breaking agent reliability.

**Detection**: Runtime (Test Execution)  
**Category**: Execution

### Behavioral Errors

#### [E500: Side Effect Detected](/testing/errors/e500-side-effect-detected/)

Tool attempted filesystem write to project files. Tools should not mutate project state.

**Detection**: Runtime (Test Execution)  
**Category**: Behavioral

## Test Framework Errors

Errors in the test framework or validation process itself.

### [E600: Unexpected Test Result](/testing/errors/e600-unexpected-test-result/)

Test expectation doesn't match actual result. Test case is incorrect or tool behavior changed.

**Detection**: Runtime (Test Execution)  
**Category**: Test Framework

## Error Detection Methods

### Static Analysis

Errors detected by analyzing tool contracts and schemas without execution:

- E100-E110: Schema & Contract Errors

These errors are found by `syrin analyse` and `syrin test`.

### Runtime Testing

Errors detected by executing tools in sandboxed environments:

- E200: Input Validation Failed
- E300-E301: Output Validation Errors
- E400-E403: Execution Errors
- E500: Behavioral Errors
- E600: Test Framework Errors

These errors are found by `syrin test` during test execution.

## Quick Reference by Detection Method

### Static Analysis Errors

Detected without running tools:

- **E100**: Missing Output Schema
- **E101**: Missing Tool Description
- **E102**: Underspecified Required Input
- **E103**: Type Mismatch
- **E104**: Parameter Not In Description
- **E105**: Free Text Propagation
- **E106**: Output Not Guaranteed
- **E107**: Circular Dependency
- **E108**: Implicit User Input
- **E109**: Non-Serializable Output
- **E110**: Tool Ambiguity

### Runtime Testing Errors

Detected during test execution:

- **E200**: Input Validation Failed
- **E300**: Output Validation Failed
- **E301**: Output Explosion
- **E400**: Tool Execution Failed
- **E403**: Unbounded Execution
- **E500**: Side Effect Detected
- **E600**: Unexpected Test Result

## See Also

- [Warning Rules](/warnings/) - Non-blocking issues and best practices
- [Writing Test Cases](/testing/writing-test-cases/) - How to write tests that catch these errors
- [Testing Documentation](/testing/) - Complete testing guide
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract documentation
