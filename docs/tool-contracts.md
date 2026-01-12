# Tool Unit Contracts

**v1.3.0 Feature**

Tool unit contracts define behavioral guarantees for individual MCP tools. They enable Syrin to validate that tools are safe for agent-driven systems through sandboxed execution.

## Overview

A tool unit contract is a YAML file that specifies:

- **Input/Output Schemas**: References to MCP tool schema names
- **Behavioral Guarantees**: Determinism, side effects, output size limits
- **Dependencies**: Other tools this tool depends on
- **Test Cases**: Explicit test inputs and expected outputs

## Contract File Format

Contract files are placed in the `tools/` directory (or custom directory specified in `syrin.yaml`):

```
tools/
  fetch_user.yaml
  create_report.yaml
  process_data.yaml
```

### Basic Structure

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

- `deterministic`: `true` if tool produces same output for same input, `false` otherwise
- `side_effects`: `'none'` (no side effects) or `'filesystem'` (writes to temp dir only)
- `max_output_size`: Maximum output size (e.g., `"50kb"`, `"1mb"`)
- `dependencies`: Array of tool names this tool depends on (empty array = no dependencies)

### `tests` (optional)

Explicit test cases:

- `name`: Test case name
- `input`: Input values for the tool
- `expect`: Expected output (currently only `output_schema` is supported)
- `env`: Environment variables for this test (optional)

## Examples

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
```

### Tool with Side Effects (Temp Directory Only)

```yaml
version: 1
tool: create_report

contract:
  input_schema: ReportRequest
  output_schema: Report

guarantees:
  deterministic: false # Reports may include timestamps
  side_effects: filesystem # Writes to temp directory only
  max_output_size: 1mb
  dependencies: []
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
```

## Validation Rules

Syrin validates tools against these rules:

### Error Rules (Blocking)

- **E012: Side Effect Detected** - Tool attempts filesystem writes to project files
- **E013: Non-Deterministic Output** - Tool produces different outputs for same input (when `deterministic: true`)
- **E014: Output Explosion** - Tool output exceeds declared `max_output_size`
- **E015: Hidden Dependency** - Tool calls other tools without declaring them in `dependencies`
- **E016: Unbounded Execution** - Tool execution timed out or failed to terminate

### Warning Rules (Non-Blocking)

- **W021: Weak Schema** - Contract schema doesn't match MCP tool schema
- **W022: High Entropy Output** - Tool output has high entropy (random, unpredictable)
- **W023: Unstable Defaults** - Tool behavior changes significantly with default values

## Running Validation

```bash
# Validate all tools
syrin test

# Test specific tool
syrin test --tool fetch_user

# Strict mode (warnings become errors)
syrin test --strict

# JSON output for CI
syrin test --json
```

## Configuration

Configure validation in `syrin.yaml`:

```yaml
check:
  timeout_ms: 30000
  memory_limit_mb: 512
  mcp_root: ./mcp-server
  tools_dir: tools
  max_output_size_kb: 50
  determinism_runs: 3
  strict_mode: false
```

## Best Practices

1. **Start Simple**: Begin with minimal guarantees, add more as needed
2. **Be Honest**: If tool is non-deterministic, set `deterministic: false`
3. **Declare Dependencies**: List all tool dependencies to avoid hidden coupling
4. **Set Output Limits**: Prevent output explosions that overwhelm LLMs
5. **Add Test Cases**: Include explicit test cases for common scenarios

## Migration Guide

For existing tools without contracts:

1. Create `tools/<tool-name>.yaml` file
2. Set `version: 1` and `tool: <tool-name>`
3. Reference input/output schema names from your MCP tool definitions
4. Start with conservative guarantees (e.g., `deterministic: false`, `side_effects: filesystem`)
5. Run `syrin test` to validate
6. Refine guarantees based on validation results

See `examples/tools/` for example contracts.
