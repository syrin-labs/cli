---
title: "Writing Test Cases"
description: "Complete guide to writing test cases and tool contracts for MCP tools in Syrin"
weight: "1"
---

## Define contracts and test your tools

This guide covers everything you need to know about writing tool contracts and test cases for your MCP tools in Syrin. Tool contracts define behavioral guarantees and test cases enable Syrin to validate that your tools behave correctly.

## What Are Tool Contracts?

Tool contracts are YAML files that define behavioral guarantees and test cases for individual MCP tools. They enable Syrin to validate that tools are safe for agent-driven systems through sandboxed execution.

## Contract File Location

Contract files are placed in the `tools/` directory (or custom directory specified in `syrin.yaml`):

```text
tools/
  fetch_user.yaml
  create_report.yaml
  process_data.yaml
```

## Contract File Structure

Every tool contract follows this basic structure:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  side_effects: none
  max_output_size: 10kb
  max_execution_time: 5s
  dependencies: []

tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

## Contract Fields

### `version` (required)

Contract version. Currently only `1` is supported.

### `tool` (required)

Tool name. Must match the MCP tool name exactly.

### `contract` (required)

Schema references:

- `input_schema`: Name of the input schema (references MCP tool's input schema)
- `output_schema`: Name of the output schema (references MCP tool's output schema)

### `guarantees` (optional)

Behavioral guarantees:

- `side_effects`: `'none'` (no side effects) or `'filesystem'` (writes to temp dir only)
- `max_output_size`: Maximum output size (e.g., `"50kb"`, `"1mb"`)
- `max_execution_time`: Maximum execution time (e.g., `"30s"`, `"5m"`, `"2h"`). If not specified, uses global default timeout
- `dependencies`: Array of tool names this tool depends on (empty array = no dependencies)

### `tests` (optional)

Explicit test cases. See [Test Case Fields](#test-case-fields) below.

## Overview

Test cases in Syrin allow you to:

- **Validate Success Scenarios**: Ensure tools work correctly with valid inputs
- **Validate Error Scenarios**: Ensure tools handle errors gracefully
- **Test Edge Cases**: Verify behavior at boundaries and with unusual inputs
- **Document Expected Behavior**: Make tool behavior explicit and verifiable

## Basic Test Case Structure

Test cases are defined in the `tests` array of your tool contract:

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

## Test Case Fields

### `name` (required)

A unique identifier for the test case. Use descriptive names that explain what the test validates:

```yaml
tests:
  - name: fetch_existing_user          # ✅ Good: Clear and descriptive
  - name: test1                        # ❌ Bad: Not descriptive
  - name: fetch_user_with_invalid_id   # ✅ Good: Describes the scenario
```

### `input` (required)

The input values to pass to the tool. Must match the tool's input schema:

```yaml
tests:
  - name: fetch_user_by_id
    input:
      user_id: '123'
      include_profile: true
```

**Input Types**:

- **Strings**: Use quotes for string values
  ```yaml
  input:
    name: 'John Doe'
    email: 'john@example.com'
  ```

- **Numbers**: No quotes for numeric values
  ```yaml
  input:
    age: 30
    count: 100
  ```

- **Booleans**: Use `true` or `false`
  ```yaml
  input:
    active: true
    verified: false
  ```

- **Arrays**: Use YAML list syntax
  ```yaml
  input:
    tags: ['admin', 'user', 'moderator']
    ids: [1, 2, 3]
  ```

- **Objects**: Use YAML object syntax
  ```yaml
  input:
    address:
      street: '123 Main St'
      city: 'New York'
      zip: '10001'
  ```

- **Null Values**: Use `null` or `~`
  ```yaml
  input:
    optional_field: null
  ```

### `expect` (optional)

The expected outcome of the test. If omitted, the test expects success with the declared output schema.

#### Success Expectations

When a test should succeed, specify the expected output schema:

```yaml
tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

#### Error Expectations

When a test should fail, specify the expected error:

```yaml
tests:
  - name: fetch_nonexistent_user
    input:
      user_id: '999'
    expect:
      error:
        type: execution_error
```

### `env` (optional)

Environment variables to set for this specific test:

```yaml
tests:
  - name: test_with_custom_env
    input:
      api_key: 'test-key'
    env:
      API_URL: 'https://test-api.example.com'
      DEBUG: 'true'
    expect:
      output_schema: Result
```

## Success Test Cases

Success test cases verify that tools work correctly with valid inputs.

### Basic Success Test

```yaml
tests:
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
```

### Testing with Multiple Inputs

```yaml
tests:
  - name: fetch_user_by_id
    input:
      user_id: '123'
    expect:
      output_schema: User
  
  - name: fetch_user_by_email
    input:
      email: 'user@example.com'
    expect:
      output_schema: User
```

### Testing Optional Parameters

```yaml
tests:
  - name: fetch_user_with_all_fields
    input:
      user_id: '123'
      include_profile: true
      include_permissions: true
    expect:
      output_schema: User
  
  - name: fetch_user_minimal
    input:
      user_id: '123'
    expect:
      output_schema: User
```

## Error Test Cases

Error test cases verify that tools handle invalid inputs and error conditions gracefully.

### Input Validation Errors

Test that tools reject invalid input:

```yaml
tests:
  - name: test_invalid_user_id_type
    input:
      user_id: 123  # Wrong type (should be string)
    expect:
      error:
        type: input_validation
        details:
          field: user_id
```

### Execution Errors

Test that tools handle runtime errors:

```yaml
tests:
  - name: test_nonexistent_user
    input:
      user_id: '999'
    expect:
      error:
        type: execution_error
```

### Output Validation Errors

Test that tools produce valid output:

```yaml
tests:
  - name: test_invalid_output
    input:
      user_id: '123'
    expect:
      error:
        type: output_validation
```

### Side Effect Errors

Test that tools don't mutate project state:

```yaml
tests:
  - name: test_side_effect_detected
    input:
      data: 'test data'
    expect:
      error:
        type: side_effect
```

### Output Explosion Errors

Test that tools respect output size limits:

```yaml
guarantees:
  max_output_size: 10kb

tests:
  - name: test_output_too_large
    input:
      query: 'fetch all records'
    expect:
      error:
        type: output_explosion
```

### Unbounded Execution Errors

Test that tools respect execution time limits:

```yaml
guarantees:
  max_execution_time: 5s

tests:
  - name: test_timeout
    input:
      query: 'infinite loop'
    expect:
      error:
        type: unbounded_execution
```

## Error Type Details

When expecting errors, you can provide additional details:

```yaml
tests:
  - name: test_invalid_input_with_details
    input:
      user_id: 123
    expect:
      error:
        type: input_validation
        details:
          field: user_id
          expected: string
          received: number
```

### Available Error Types

| Error Type | Error Code | When to Use |
|------------|------------|-------------|
| `input_validation` | E200 | Tool input doesn't match schema |
| `output_validation` | E300 | Tool output doesn't match schema |
| `execution_error` | E400 | Tool crashes or fails at runtime |
| `side_effect` | E500 | Tool writes to project files |
| `output_explosion` | E301 | Tool output exceeds size limit |
| `unbounded_execution` | E403 | Tool execution times out |

See [Error Rules Documentation](/errors/) for complete details on each error type.

## Edge Case Testing

Test edge cases to ensure robust behavior:

### Boundary Values

```yaml
tests:
  - name: test_max_days
    input:
      location: 'London'
      days: 16  # Maximum allowed
    expect:
      output_schema: Forecast
  
  - name: test_max_days_plus_one
    input:
      location: 'London'
      days: 17  # One over maximum
    expect:
      error:
        type: input_validation
```

### Empty Values

```yaml
tests:
  - name: test_empty_string
    input:
      query: ''
    expect:
      error:
        type: input_validation
  
  - name: test_empty_array
    input:
      items: []
    expect:
      output_schema: Result
```

### Null Values

```yaml
tests:
  - name: test_null_optional_field
    input:
      user_id: '123'
      optional_field: null
    expect:
      output_schema: User
```

### Special Characters

```yaml
tests:
  - name: test_special_characters
    input:
      query: 'test@example.com & more!'
    expect:
      output_schema: Result
```

## Complex Input Testing

### Nested Objects

```yaml
tests:
  - name: test_nested_object
    input:
      user:
        id: '123'
        profile:
          name: 'John'
          email: 'john@example.com'
    expect:
      output_schema: Result
```

### Arrays of Objects

```yaml
tests:
  - name: test_array_of_objects
    input:
      users:
        - id: '1'
          name: 'John'
        - id: '2'
          name: 'Jane'
    expect:
      output_schema: Result
```

### Mixed Types

```yaml
tests:
  - name: test_mixed_types
    input:
      id: '123'
      count: 10
      active: true
      tags: ['admin', 'user']
      metadata:
        created: '2024-01-01'
    expect:
      output_schema: Result
```

## Environment-Specific Testing

Use the `env` field to test different environments:

```yaml
tests:
  - name: test_production_api
    input:
      api_key: 'prod-key'
    env:
      API_URL: 'https://api.example.com'
    expect:
      output_schema: Result
  
  - name: test_staging_api
    input:
      api_key: 'staging-key'
    env:
      API_URL: 'https://staging-api.example.com'
    expect:
      output_schema: Result
```

## Test Organization

### Group Related Tests

Organize tests by scenario:

```yaml
tests:
  # Success scenarios
  - name: fetch_existing_user
    input:
      user_id: '123'
    expect:
      output_schema: User
  
  - name: fetch_user_with_profile
    input:
      user_id: '123'
      include_profile: true
    expect:
      output_schema: User
  
  # Error scenarios
  - name: fetch_nonexistent_user
    input:
      user_id: '999'
    expect:
      error:
        type: execution_error
  
  - name: fetch_user_invalid_id
    input:
      user_id: 'invalid'
    expect:
      error:
        type: input_validation
```

### Use Descriptive Names

```yaml
tests:
  - name: fetch_user_by_valid_uuid
    # ✅ Good: Clear what it tests
  
  - name: fetch_user_missing_required_field
    # ✅ Good: Describes the error case
  
  - name: test1
    # ❌ Bad: Not descriptive
```

## Best Practices

### 1. Test Both Success and Failure

Always include tests for both successful operations and error conditions:

```yaml
tests:
  - name: success_case
    input:
      user_id: '123'
    expect:
      output_schema: User
  
  - name: error_case
    input:
      user_id: 'invalid'
    expect:
      error:
        type: execution_error
```

### 2. Test Edge Cases

Include tests for boundary values, empty inputs, and unusual cases:

```yaml
tests:
  - name: test_min_value
    input:
      count: 0
    expect:
      output_schema: Result
  
  - name: test_max_value
    input:
      count: 100
    expect:
      output_schema: Result
  
  - name: test_empty_input
    input:
      query: ''
    expect:
      error:
        type: input_validation
```

### 3. Use Realistic Data

Use realistic test data that reflects actual usage:

```yaml
tests:
  - name: fetch_real_user
    input:
      user_id: '550e8400-e29b-41d4-a716-446655440000'  # Realistic UUID
    expect:
      output_schema: User
```

### 4. Test All Required Fields

Ensure all required fields are tested:

```yaml
tests:
  - name: test_with_all_required_fields
    input:
      user_id: '123'
      email: 'user@example.com'
      name: 'John Doe'
    expect:
      output_schema: User
```

### 5. Test Optional Fields

Test both with and without optional fields:

```yaml
tests:
  - name: test_with_optional_field
    input:
      user_id: '123'
      include_profile: true
    expect:
      output_schema: User
  
  - name: test_without_optional_field
    input:
      user_id: '123'
    expect:
      output_schema: User
```

### 6. Document Complex Tests

Add comments for complex test scenarios:

```yaml
tests:
  # Test that tool handles pagination correctly
  - name: test_pagination
    input:
      page: 1
      page_size: 10
    expect:
      output_schema: PaginatedResult
```

## Common Patterns

### Testing Validation

```yaml
tests:
  - name: test_valid_input
    input:
      email: 'user@example.com'
    expect:
      output_schema: Result
  
  - name: test_invalid_email_format
    input:
      email: 'not-an-email'
    expect:
      error:
        type: input_validation
```

### Testing Defaults

```yaml
tests:
  - name: test_with_defaults
    input:
      user_id: '123'
      # Optional fields use defaults
    expect:
      output_schema: User
  
  - name: test_with_custom_values
    input:
      user_id: '123'
      include_profile: true
      include_permissions: true
    expect:
      output_schema: User
```

### Testing Error Messages

```yaml
tests:
  - name: test_error_with_message
    input:
      user_id: 'invalid'
    expect:
      error:
        type: execution_error
        details:
          message: 'User not found'
```

## Complete Contract Examples

### Simple Tool (No Side Effects)

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
  - name: fetch_nonexistent_user
    input:
      user_id: '999'
    expect:
      error:
        type: execution_error
```

### Tool with Side Effects (Temp Directory Only)

```yaml
version: 1
tool: create_report

contract:
  input_schema: ReportRequest
  output_schema: Report

guarantees:
  side_effects: filesystem # Writes to temp directory only
  max_output_size: 1mb
  max_execution_time: 30s
  dependencies: []

tests:
  - name: create_simple_report
    input:
      title: 'Monthly Report'
      data: ['item1', 'item2']
    expect:
      output_schema: Report
```

### Tool with Dependencies

```yaml
version: 1
tool: process_data

contract:
  input_schema: ProcessDataRequest
  output_schema: ProcessedData

guarantees:
  side_effects: none
  max_output_size: 50kb
  dependencies:
    - fetch_user
    - validate_data

tests:
  - name: process_valid_data
    input:
      user_id: '123'
      data: 'test data'
    expect:
      output_schema: ProcessedData
  - name: process_invalid_user
    input:
      user_id: '999'
      data: 'test data'
    expect:
      error:
        type: execution_error
```

## Contract Best Practices

1. **Start Simple**: Begin with minimal guarantees, add more as needed
2. **Be Honest**: Declare side effects accurately
3. **Declare Dependencies**: List all tool dependencies to avoid hidden coupling
4. **Set Output Limits**: Prevent output explosions that overwhelm LLMs
5. **Add Test Cases**: Include explicit test cases for common scenarios and edge cases
6. **Test Error Cases**: Include tests that expect errors to ensure proper error handling
7. **Use Appropriate Error Types**: Specify the correct error type in test expectations

## Migration Guide

For existing tools without contracts:

1. Create `tools/<tool-name>.yaml` file
2. Set `version: 1` and `tool: <tool-name>`
3. Reference input/output schema names from your MCP tool definitions
4. Start with conservative guarantees (e.g., `side_effects: filesystem`)
5. Run `syrin test` to validate
6. Refine guarantees based on validation results
7. Add test cases for common scenarios and error conditions

See `examples/tools/` for example contracts.

## See Also

- [Test Execution Process](/testing/test-execution/)
- [Test Configuration](/testing/test-configuration/)
- [Error Rules Documentation](/errors/)
- [Warning Rules Documentation](/warnings/)
