---
title: 'Testing'
description: 'Comprehensive guide to testing MCP tools with Syrin'
weight: '1'
---

## Test with confidence

Syrin provides comprehensive testing capabilities for MCP tools through sandboxed execution, behavioral observation, and contract validation. This guide covers everything you need to know about testing your tools.

## Overview

Syrin's testing system validates tools through:

- **Sandboxed Execution**: Tools run in isolated environments with resource limits
- **Behavioral Observation**: Detects side effects and hidden dependencies
- **Contract Validation**: Ensures tools match their declared contracts
- **Synthetic Input Generation**: Automatically generates test inputs from schemas
- **Explicit Test Cases**: Support for contract-defined test cases

## Documentation Sections

### [Writing Test Cases](/testing/writing-test-cases/)

Complete guide to writing test cases for your MCP tools. Learn how to:

- Structure test cases in YAML
- Write success and error test cases
- Test edge cases and complex inputs
- Use environment variables in tests
- Follow best practices for test organization

### [Test Command](/testing/test-command/)

How to run tests and use all available command flags. Learn about:

- Basic test execution
- Command-line options
- Output modes (interactive, JSON, CI)
- Exit codes
- Common usage patterns

### [Test Execution Process](/testing/test-execution/)

How Syrin executes tests and validates tool behavior. Understand:

- Contract loading and validation
- Sandboxed execution environment
- Behavioral observation mechanisms
- Rule evaluation process
- Test types and execution modes

### [Test Configuration](/testing/test-configuration/)

How to configure testing behavior in Syrin. Configure:

- Global settings in `syrin.yaml`
- Per-tool guarantees in contract files
- Resource limits and timeouts
- Environment variables

### [Test Results](/testing/test-results/)

Understanding test results and output formats. Learn to:

- Interpret interactive output
- Parse JSON results
- Use CI mode effectively
- Understand diagnostics
- Integrate results into CI/CD pipelines

### [Troubleshooting](/testing/troubleshooting/)

Common test issues and how to resolve them. Fix:

- Tool not found errors
- Timeout issues
- Side effect detection
- Output size exceeded
- Input/output validation failures

## Quick Start

### 1. Write Test Cases

Create test cases in your tool contract:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb

tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

### 2. Run Tests

```bash
syrin test
```

### 3. Review Results

Check test output for:

- ✓ Passed tests
- ✗ Failed tests
- ⚠️ Warnings

## Key Concepts

### Test Types

- **Contract-Defined Tests**: Explicit test cases in YAML
- **Synthetic Input Generation**: Auto-generated from schemas

### Test Expectations

- **Success**: Tool produces expected output
- **Error**: Tool handles errors correctly

### Error Types

- `input_validation` (E200)
- `output_validation` (E300)
- `execution_error` (E400)
- `side_effect` (E500)
- `output_explosion` (E301)
- `unbounded_execution` (E403)

## Best Practices

1. **Write Explicit Test Cases**: Don't rely solely on synthetic generation
2. **Test Both Success and Failure**: Include error test cases
3. **Set Realistic Limits**: Base limits on actual tool behavior
4. **Declare Dependencies**: Always list tool dependencies
5. **Use Strict Mode in CI**: Catch warnings in automated pipelines
6. **Test Incrementally**: Test tools as you develop them

## See Also

- [Error Rules Documentation](/errors/)
- [Warning Rules Documentation](/warnings/)
- [Writing Test Cases](/testing/writing-test-cases/) - Includes tool contract structure
- [CI Integration Documentation](/ci/)
