---
title: "syrin test"
description: "Validate MCP tool contracts through sandboxed execution and behavioral testing"
weight: "3"
---

## Put your tools to the test

Validate MCP tool contracts through sandboxed execution, behavioral observation, and contract validation.

`syrin test` is the **primary tool validation command** in Syrin v1.3.0. It validates that your MCP tools match their declared contracts, behave correctly, and are safe for agent-driven systems.

This command answers critical questions:

> Do my tools work as declared? Are they safe for production use?

## Default Behavior: Tool Validation

By default, `syrin test` validates tool contracts:

- **Sandboxed Execution**: Tools run in isolated environments with resource limits
- **Behavioral Observation**: Detects side effects and validates contract compliance
- **Contract Validation**: Ensures tools match their declared contracts
- **Test Execution**: Runs explicit test cases and generates synthetic inputs

## Legacy Mode: Connection Testing

Use the `--connection` flag for legacy connection testing behavior:

```bash
syrin test --connection
```

This mode validates MCP connectivity and protocol compliance only. See [Connection Testing](#connection-testing-legacy-mode) below.

## Usage

### Tool Validation (Default)

```bash
# Test all tools
syrin test

# Test specific tool
syrin test --tool fetch_user

# Test tools in specific path
syrin test --path weather

# Strict mode (warnings become errors)
syrin test --strict

# JSON output for CI
syrin test --json

# CI mode (minimal output)
syrin test --ci
```

### Connection Testing (Legacy)

```bash
# Test connection using config
syrin test --connection

# Test HTTP connection
syrin test --connection http://localhost:3000

# Test stdio connection
syrin test --connection --transport stdio --script "python server.py"
```

## Options

### Tool Validation Options

| Flag                    | Description                                                      | Default            |
| ----------------------- | ---------------------------------------------------------------- | ------------------ |
| `--tool <name>`         | Test specific tool only                                          | All tools          |
| `--path <path>`         | Test tools in specific path (relative to tools directory)       | All paths          |
| `--strict`              | Treat warnings as errors                                         | `false`            |
| `--json`                | Output results as JSON                                           | `false`            |
| `--ci`                  | CI mode: minimal output, exit code 1 on errors                 | `false`            |
| `--show-errors`         | Show sandbox process error output (stderr from MCP server)      | `false`            |
| `--tools-dir <path>`    | Tools directory (overrides config)                               | From `syrin.yaml`  |
| `--project-root <path>` | Syrin project root directory                                     | Current directory  |

### Connection Testing Options (Legacy)

| Flag                  | Description                                                      | Default            |
| --------------------- | ---------------------------------------------------------------- | ------------------ |
| `--connection`        | Test MCP connection only (legacy behavior)                      | `false`            |
| `[url-or-script]`     | MCP URL (HTTP) or execution script (stdio)                       | From `syrin.yaml` |
| `--transport <type>`  | Transport type: `http` or `stdio`                                | From config        |
| `--url <url>`         | MCP URL to test (HTTP transport)                                 | From config or positional |
| `--script <script>`   | Script to test (stdio transport)                                | From config or positional |

**Note**: When using `--connection`, tool validation options (`--tool`, `--strict`, `--tools-dir`) are ignored.

### Global Options

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

```bash
# Quiet mode for CI pipelines
syrin --quiet test --ci

# Verbose mode for debugging
syrin --verbose test --tool my_tool
```

## What syrin test Does (Tool Validation)

### 1. Contract Loading

Loads and validates tool contracts from the `tools/` directory:

- Validates YAML syntax
- Checks required fields (version, tool, contract)
- Validates schema references
- Verifies guarantee declarations

### 2. Sandboxed Execution

Executes tools in isolated environments:

- **Resource Limits**: Memory and CPU constraints
- **I/O Monitoring**: Filesystem access tracking
- **Timeout Protection**: Execution time limits
- **Process Isolation**: Separate process for each tool

### 3. Behavioral Observation

Monitors tool behavior during execution:

- **Side Effects**: Filesystem writes to project files
- **Output Size**: Actual output vs. declared limits
- **Execution Time**: Actual time vs. declared limits

### 4. Rule Evaluation

Evaluates results against comprehensive analysis rules:

- **Error Rules**: Blocking issues (E100-E600)
- **Warning Rules**: Non-blocking issues (W100-W301)
- **Test Expectations**: Contract-defined test cases

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

See [Writing Test Cases](/testing/writing-test-cases/) for detailed guidance.

### Synthetic Input Generation

Syrin automatically generates test inputs from JSON Schema definitions when no explicit tests are provided:

- Generates valid inputs based on schema constraints
- Tests edge cases (boundaries, required fields, etc.)
- Explores different input combinations

## Output Formats

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

Returns structured JSON suitable for CI/CD integration. See [Test Results](/testing/test-results/) for JSON structure details.

### CI Mode

```bash
syrin test --ci
```

- Minimal output (errors only)
- Exit code 1 on errors
- Suitable for CI/CD pipelines

## Exit Codes

| Code | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| `0`  | All tests passed (no errors)                                    |
| `1`  | Tests failed (errors found, or warnings in strict mode)          |

## Examples

### Test All Tools

```bash
syrin test
```

### Test Specific Tool

```bash
syrin test --tool fetch_user
```

### Test Tools in Path

```bash
syrin test --path weather
```

### Strict Mode

```bash
syrin test --strict
```

Treats warnings as errors.

### JSON Output for CI

```bash
syrin test --json > test-results.json
```

### CI Mode Example

```bash
syrin test --ci
```

Minimal output, suitable for automated pipelines.

### Debug Failed Tests

```bash
syrin test --tool fetch_user --show-errors
```

Shows sandbox process errors for debugging.

## Connection Testing (Legacy Mode)

When using the `--connection` flag, `syrin test` validates MCP connectivity and protocol compliance only.

### What It Does

1. Establishes a connection to the MCP server
2. Performs the MCP protocol handshake
3. Retrieves and validates server capabilities
4. Verifies protocol-level message compliance

### When to Use

- After initial project setup
- After changing the transport configuration
- When protocol behavior is uncertain
- For quick connectivity checks

### Connection Testing Examples

```bash
# Test using project configuration
syrin test --connection

# Test HTTP transport
syrin test --connection http://localhost:3000

# Test stdio transport
syrin test --connection --transport stdio --script "python server.py"
```

## Configuration

Configure testing in `syrin.yaml`:

```yaml
check:
  timeout_ms: 30000           # Global timeout (30 seconds)
  mcp_root: ./mcp-server       # MCP server root directory
  tools_dir: tools             # Tools directory
  max_output_size_kb: 50       # Default max output size
  strict_mode: false           # Treat warnings as errors
```

See [Test Configuration](/testing/test-configuration/) for complete configuration options.

## Common Issues and Solutions

### Tool Not Found

**Error**: `E000: Tool Not Found`

**Solution**: Verify tool is registered in MCP server and tool name matches contract.

See [Troubleshooting](/testing/troubleshooting/) for more solutions.

### Timeout Issues

**Error**: `E403: Unbounded Execution`

**Solution**: Increase `max_execution_time` in contract or optimize tool performance.

### Side Effect Detection

**Error**: `E500: Side Effect Detected`

**Solution**: Remove filesystem writes to project files or update `side_effects` guarantee.

## When You Should Run This

- **During Development**: Test tools as you develop them
- **Before Commits**: Validate changes before committing
- **In CI/CD**: Automated validation in pipelines
- **Before Deployment**: Final validation before production

## Relationship to Other Commands

- `syrin init` - Establishes project structure
- `syrin doctor` - Validates configuration correctness
- `syrin analyse` - Static analysis of tool contracts
- `syrin test` - Runtime validation of tool behavior
- `syrin dev` - Interactive development mode

## See Also

- [Writing Test Cases](/testing/writing-test-cases/) - Complete guide to writing test cases
- [Test Execution Process](/testing/test-execution/) - How tests are executed
- [Test Configuration](/testing/test-configuration/) - Configuration options
- [Test Results](/testing/test-results/) - Understanding test output
- [Troubleshooting](/testing/troubleshooting/) - Common issues and solutions
- [Error Rules](/errors/) - All error codes and rules
- [Warning Rules](/warnings/) - All warning codes and rules
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract and test case documentation
