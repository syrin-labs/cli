---
title: 'Test Execution Process'
description: 'How Syrin executes tests and validates tool behavior'
weight: '3'
---

# Test Execution Process

This guide explains how Syrin executes tests and validates tool behaviour through sandboxed execution and behavioural observation.

## Overview

Syrin's test execution process consists of four main phases:

1. **Contract Loading**: Load and validate tool contracts
2. **Sandboxed Execution**: Run tools in isolated environments
3. **Behavioral Observation**: Monitor tool behavior during execution
4. **Rule Evaluation**: Evaluate results against analysis rules

## Phase 1: Contract Loading

Syrin loads tool contracts from the `tools/` directory (or custom directory specified in `syrin.yaml`):

```yaml
# syrin.yaml
check:
  tools_dir: tools
```

### Contract Validation

Contracts are validated for:

- **YAML Syntax**: Ensures valid YAML format
- **Required Fields**: Checks for `version`, `tool`, and `contract` fields
- **Schema References**: Validates that `input_schema` and `output_schema` reference valid schemas
- **Guarantee Declarations**: Validates guarantee syntax and values

### Contract Structure

Each contract must follow this structure:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb
  dependencies: []

tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

## Phase 2: Sandboxed Execution

Tools are executed in isolated sandbox environments with strict resource limits and monitoring.

### Sandbox Features

- **Resource Limits**: Memory and CPU constraints prevent resource exhaustion
- **I/O Monitoring**: Filesystem access tracking detects side effects
- **Timeout Protection**: Execution time limits prevent infinite loops
- **Process Isolation**: Separate process for each tool execution

### Execution Environment

Each tool runs in:

- **Isolated Process**: Separate from the main Syrin process
- **Temp Directory**: Writable temporary directory for legitimate file operations
- **Resource Constraints**: Memory and CPU limits based on configuration
- **Network Access**: Allowed but monitored for side effects

### Execution Flow

1. **Start MCP Server**: Launch MCP server process (if stdio transport)
2. **Load Tool Contract**: Read and validate contract file
3. **Prepare Test Inputs**: Generate or load test inputs
4. **Execute Tool**: Call tool with test input in sandbox
5. **Monitor Execution**: Track I/O, time, memory, and dependencies
6. **Collect Results**: Capture output, errors, and behavioral data

## Phase 3: Behavioral Observation

During execution, Syrin observes and records tool behavior.

### Observed Behaviors

- **Side Effects**: Filesystem writes to project files
- **Hidden Dependencies**: Undeclared tool calls
- **Output Size**: Actual output vs. declared limits
- **Execution Time**: Actual time vs. declared limits

### Monitoring Mechanisms

#### Filesystem Monitoring

Syrin tracks all filesystem operations:

- **Allowed**: Writes to temp directory
- **Blocked**: Writes to project files
- **Detected**: E500 (Side Effect Detected)

#### Output Analysis

Syrin analyzes tool outputs:

- **Size Measurement**: Actual output size in bytes
- **Schema Validation**: Output matches declared schema

#### Execution Metrics

Syrin tracks execution metrics:

- **Execution Time**: Time taken to complete
- **Memory Usage**: Memory consumed during execution
- **Timeout Detection**: Execution exceeds time limit

## Phase 4: Rule Evaluation

Test results are evaluated against comprehensive analysis rules.

### Error Rules (Blocking)

Errors must be fixed before tools can be used:

- **E100-E110**: Schema & Contract Errors
- **E200**: Input Validation Errors
- **E300-E301**: Output Validation Errors
- **E400-E403**: Execution Errors
- **E500**: Behavioral Errors
- **E600**: Test Framework Errors

### Warning Rules (Non-Blocking)

Warnings indicate potential issues:

- **W100-W110**: Schema & Contract Warnings
- **W300-W301**: Output Validation Warnings

### Test Expectation Matching

Syrin compares actual results with test expectations:

- **Success Tests**: Output matches expected schema
- **Error Tests**: Error type matches expected error
- **Mismatch Detection**: E600 (Unexpected Test Result)

## Test Types

### Contract-Defined Tests

Explicit test cases defined in contract files:

```yaml
tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

### Synthetic Input Generation

Syrin automatically generates test inputs when no explicit tests are provided:

- Generates valid inputs based on schema constraints
- Tests edge cases (boundaries, required fields, etc.)
- Explores different input combinations

Synthetic inputs are prefixed with `synthetic_input_` in test names.

## Execution Modes

### Single Tool Execution

Test one tool at a time:

```bash
syrin test --tool fetch_user
```

### Batch Execution

Test multiple tools:

```bash
syrin test
```

Syrin optimises batch execution by:

- Starting the MCP server once
- Testing all tools
- Closing the server after all tests are complete

This is critical for performance when testing 100+ tools.

## See Also

- [Writing Test Cases](/testing/writing-test-cases/)
- [Test Configuration](/testing/test-configuration/)
- [Test Results](/testing/test-results/)
