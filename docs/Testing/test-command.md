---
title: 'Test Command'
description: 'How to run tests and use test command flags in Syrin'
weight: '7.2'
---

## Test Command

The `syrin test` command validates your MCP tools through sandboxed execution and behavioral observation. This guide covers how to use the test command and all available options.

## Basic Usage

### Test All Tools

```bash
syrin test
```

Tests all tools in the configured `tools_dir` directory.

### Test Specific Tool

```bash
syrin test --tool fetch_user
```

Tests only the specified tool.

### Test Tools in Specific Path

```bash
syrin test --path weather
```

Tests all tools in the specified path (relative to tools directory).

## Command Flags

| Flag                    | Description                                                | Default           |
| ----------------------- | ---------------------------------------------------------- | ----------------- |
| `--tool <name>`         | Test specific tool only                                    | All tools         |
| `--path <path>`         | Test tools in specific path (relative to tools directory)  | All paths         |
| `--strict`              | Treat warnings as errors                                   | `false`           |
| `--json`                | Output results as JSON                                     | `false`           |
| `--ci`                  | CI mode: minimal output, exit code 1 on errors             | `false`           |
| `--show-errors`         | Show sandbox process error output (stderr from MCP server) | `false`           |
| `--tools-dir <path>`    | Tools directory (overrides config)                         | From `syrin.yaml` |
| `--transport <type>`    | Transport type: `http` or `stdio`                          | From config       |
| `--url <url>`           | MCP URL for HTTP transport                                 | From config       |
| `--script <script>`     | Script for stdio transport                                 | From config       |
| `--project-root <path>` | Syrin project root directory                               | Current directory |

## Common Usage Patterns

### Development Workflow

Test a specific tool while developing:

```bash
syrin test --tool my_new_tool
```

### CI/CD Pipeline

Use CI mode with JSON output:

```bash
syrin test --ci --json > test-results.json
```

### Strict Validation

Enable strict mode to catch warnings:

```bash
syrin test --strict
```

### Debugging Failed Tests

Show sandbox errors for debugging:

```bash
syrin test --show-errors
```

## Output Modes

### Interactive Mode (Default)

```bash
syrin test
```

Shows:

- Test execution progress
- Pass/fail status for each tool
- Error and warning diagnostics
- Execution summary

### JSON Mode

```bash
syrin test --json
```

Returns structured JSON output suitable for programmatic processing:

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
        "failedExecutions": 0
      }
    }
  ]
}
```

### CI Mode

```bash
syrin test --ci
```

- Minimal output (errors only)
- Exit code 1 on errors
- Suitable for CI/CD pipelines
- Suppresses verbose logging

## Exit Codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| `0`  | All tests passed (no errors)                            |
| `1`  | Tests failed (errors found, or warnings in strict mode) |

## Examples

### Test Single Tool

```bash
syrin test --tool fetch_user
```

### Test Tools in Weather Directory

```bash
syrin test --path weather
```

### Strict Mode with JSON Output

```bash
syrin test --strict --json > results.json
```

### CI Mode with Custom Tools Directory

```bash
syrin test --ci --tools-dir ./custom-tools
```

### Debug Mode with Error Output

```bash
syrin test --tool fetch_user --show-errors
```

## See Also

- [Writing Test Cases](/testing/writing-test-cases/)
- [Test Execution Process](/testing/test-execution/)
- [Test Results](/testing/test-results/)
