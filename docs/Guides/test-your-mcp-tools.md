---
title: 'Test Your MCP Tools'
description: 'Write tool contracts and run sandboxed tests to validate your MCP tools'
weight: 3
---

## Trust, But Verify (Then Verify Again)

`syrin test` runs your tools in a sandbox, observes their behavior, and reports violations. It catches side effects, output explosions, non-determinism, and schema mismatches before they hit production.

## What You Need

- Local init completed (`syrin init`)
- An MCP server (running or script-based)
- Tool contract files in `tools/` directory (optional -- Syrin can generate synthetic inputs)

## Run Your First Test

![syrin test demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_tool.gif)

### Test All Tools

```bash
syrin test
```

### Test a Specific Tool

```bash
syrin test --tool fetch_user
```

### Test Connection Only

```bash
syrin test --connection
```

![syrin test connection demo](https://github.com/Syrin-Labs/cli/raw/main/assets/demo/syrin-test/test_connection.gif)

## Writing a Tool Contract

Create `tools/<tool-name>.yaml` in your project root:

```yaml
version: 1
tool: get_weather

contract:
  input_schema:
    type: object
    properties:
      location:
        type: string
    required:
      - location
  output_schema:
    type: object
    properties:
      temperature:
        type: number
      condition:
        type: string

guarantees:
  side_effects: none
  max_output_size: 10kb

tests:
  - name: 'Valid location'
    input:
      location: 'San Francisco'
    expect: success

  - name: 'Empty location'
    input:
      location: ''
    expect: error
```

### Contract Fields

| Field                        | Required | Description                                    |
| ---------------------------- | -------- | ---------------------------------------------- |
| `version`                    | Yes      | Contract version (always `1`)                  |
| `tool`                       | Yes      | Tool name (must match MCP server registration) |
| `contract.input_schema`      | No       | Expected input JSON schema                     |
| `contract.output_schema`     | No       | Expected output JSON schema                    |
| `guarantees.side_effects`    | No       | `none`, `read`, or `write`                     |
| `guarantees.max_output_size` | No       | Maximum output size (e.g., `10kb`, `1mb`)      |
| `tests`                      | No       | Array of test cases                            |

If you do not write test cases, Syrin generates synthetic inputs from the tool's schema.

## Reading Test Results

Syrin reports three verdicts:

- **pass** -- All checks passed
- **pass-with-warnings** -- Passed, but some non-blocking issues found
- **fail** -- One or more errors detected

Each issue includes an error code (e.g., `E500`) with a description. See the [Error Reference](/testing/error-reference/) and [Warning Reference](/testing/warning-reference/) for all codes.

## What It Catches

| Issue             | Error Code | Description                            |
| ----------------- | ---------- | -------------------------------------- |
| Side effects      | E500       | Tool writes to filesystem              |
| Output explosion  | E301       | Output exceeds declared size limit     |
| Execution timeout | E403       | Tool did not terminate                 |
| Schema mismatch   | E300       | Output does not match declared schema  |
| Non-determinism   | W300       | Output changes between identical calls |
| Weak contract     | W110       | Contract schema is too loose           |

## Strict Mode

Treat warnings as errors:

```bash
syrin test --strict
```

A warning (like W300) becomes a failure. Useful for enforcing higher quality standards.

## JSON Output for CI

```bash
syrin test --json
```

Outputs structured JSON for parsing in CI pipelines.

## CI Mode

```bash
syrin test --ci
```

Exits with code 1 on any failure. Combine with `--strict` for maximum strictness:

```bash
syrin test --ci --strict
```

## See Also

- [Error Reference](/testing/error-reference/) -- All error codes explained
- [Warning Reference](/testing/warning-reference/) -- All warning codes explained
- [Writing Test Cases](/testing/writing-test-cases/) -- Detailed contract authoring guide
- [Test Configuration](/testing/test-configuration/) -- Timeouts, limits, and per-tool overrides
