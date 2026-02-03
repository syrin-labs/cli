---
title: 'Test Results'
description: 'Understanding test results and output formats in Syrin'
weight: '5'
---

# Test Results

This guide explains how to interpret test results from Syrin, including various output formats and their corresponding meanings.

## Output Formats

Syrin supports multiple output formats for different use cases:

- **Interactive Mode**: Human-readable output for development
- **JSON Mode**: Machine-readable output for CI/CD
- **CI Mode**: Minimal output for automated pipelines

## Interactive Mode (Default)

### Basic Output

```bash
syrin test
```

Shows:

- Test execution progress
- Pass/fail status for each tool
- Error and warning diagnostics
- Execution summary

### Example Output

```
Testing MCP Tools
================

✓ fetch_user (3/3 tests passed)
  ✓ fetch_existing_user
  ✓ fetch_user_with_profile
  ✓ fetch_nonexistent_user (expected error)

✗ process_data (1/3 tests passed)
  ✓ process_valid_data
  ✗ process_invalid_data
    E200: Input validation failed: Field "data" - Invalid type
  ✗ process_empty_data
    E200: Input validation failed: Missing required field "data"

Summary:
  Total: 10 tools
  Passed: 8
  Failed: 2
  Warnings: 3
  Errors: 2
```

## JSON Mode

### Basic Usage

```bash
syrin test --json
```

### Output Structure

```json
{
  "verdict": "pass",
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2,
    "warnings": 3,
    "errors": 2
  },
  "tools": [
    {
      "toolName": "fetch_user",
      "passed": true,
      "diagnostics": [],
      "summary": {
        "totalExecutions": 5,
        "successfulExecutions": 5,
        "failedExecutions": 0,
        "timedOutExecutions": 0,
        "testsPassed": 3,
        "testsFailed": 0
      }
    },
    {
      "toolName": "process_data",
      "passed": false,
      "diagnostics": [
        {
          "code": "E200",
          "severity": "error",
          "message": "Tool \"process_data\" input validation failed: Field \"data\" - Invalid type",
          "tool": "process_data",
          "field": "data",
          "suggestion": "Fix input validation to handle edge cases gracefully"
        }
      ],
      "summary": {
        "totalExecutions": 3,
        "successfulExecutions": 1,
        "failedExecutions": 2,
        "timedOutExecutions": 0,
        "testsPassed": 1,
        "testsFailed": 2
      }
    }
  ]
}
```

### JSON Fields

#### Top-Level Fields

- `verdict`: Overall test result (`"pass"` or `"fail"`)
- `summary`: Aggregate statistics
- `tools`: Array of tool test results

#### Summary Fields

- `total`: Total number of tools tested
- `passed`: Number of tools that passed
- `failed`: Number of tools that failed
- `warnings`: Number of warnings found
- `errors`: Number of errors found

#### Tool Result Fields

- `toolName`: Name of the tool
- `passed`: Whether the tool passed (`true` or `false`)
- `diagnostics`: Array of error/warning diagnostics
- `summary`: Execution statistics for this tool

#### Diagnostic Fields

- `code`: Error or warning code (e.g., `"E200"`, `"W100"`)
- `severity`: Severity level (`"error"` or `"warning"`)
- `message`: Human-readable error message
- `tool`: Tool name
- `field`: Field name (if applicable)
- `suggestion`: Suggested fix

## CI Mode

### Basic Usage

```bash
syrin test --ci
```

### Characteristics

- **Minimal Output**: Only shows errors and failures
- **Exit Codes**: Returns exit code 1 on errors
- **No Progress**: Suppresses verbose logging
- **Suitable for CI/CD**: Designed for automated pipelines

### Example Output

```
✗ process_data: E200 - Input validation failed
✗ fetch_weather: E403 - Unbounded execution

2 tools failed
```

## Exit Codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| `0`  | All tests passed (no errors)                            |
| `1`  | Tests failed (errors found, or warnings in strict mode) |

## Understanding Results

### Passed Tools

A tool passes when:

- All test cases match expectations
- No errors are detected
- Warnings may be present (unless strict mode)

### Failed Tools

A tool fails when:

- Test cases don't match expectations
- Errors are detected
- Warnings are present (in strict mode)

### Diagnostics

Diagnostics provide detailed information about issues:

- **Error Codes**: Specific error identifier (E100-E600)
- **Warning Codes**: Specific warning identifier (W100-W301)
- **Messages**: Human-readable description
- **Suggestions**: Recommended fixes

## Result Interpretation

### Success Indicators

- ✓ Green checkmarks for passed tests
- `"verdict": "pass"` in JSON output
- Exit code 0

### Failure Indicators

- ✗ Red X marks for failed tests
- `"verdict": "fail"` in JSON output
- Exit code 1
- Error diagnostics in output

### Warning Indicators

- ⚠️ Yellow warning symbols
- `"severity": "warning"` in diagnostics
- Non-blocking (unless strict mode)

## Common Result Patterns

### All Tests Pass

```
✓ All tools passed (10/10)
```

### Some Tests Fail

```
✗ 2 tools failed
  - process_data: E200
  - fetch_weather: E403
```

### Warnings Only

```
⚠ 3 warnings found
  - fetch_user: W100
  - process_data: W101
  - get_weather: W102
```

### Mixed Results

```
✓ 8 tools passed
✗ 2 tools failed
⚠ 3 warnings found
```

## Using Results in CI/CD

### GitHub Actions

```yaml
- name: Run Tests
  run: syrin test --ci --json > results.json

- name: Check Results
  run: |
    if [ $(jq -r '.verdict' results.json) != "pass" ]; then
      echo "Tests failed"
      exit 1
    fi
```

### GitLab CI

```yaml
test:
  script:
    - syrin test --ci --json > results.json
    - |
      if [ $(jq -r '.verdict' results.json) != "pass" ]; then
        exit 1
      fi
```

## See Also

- [Test Command](/testing/test-command/)
- [Troubleshooting](/testing/troubleshooting/)
- [CI Integration](/ci/)
