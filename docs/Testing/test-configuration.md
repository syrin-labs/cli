---
title: 'Test Configuration'
description: 'How to configure testing behavior in Syrin'
weight: '7.4'
---

## Test Configuration

Configure Syrin's testing behavior through `syrin.yaml` and per-tool contract files. This guide covers all configuration options.

## Global Configuration

Configure testing in `syrin.yaml`:

```yaml
check:
  timeout_ms: 30000 # Global timeout (30 seconds)
  tools_dir: tools # Tools directory
  max_output_size_kb: 50 # Default max output size
  strict_mode: false # Treat warnings as errors
```

## Configuration Options

### `timeout_ms`

Global timeout for tool execution in milliseconds.

**Default**: `30000` (30 seconds)

**Example**:

```yaml
check:
  timeout_ms: 60000 # 60 seconds
```

### `tools_dir`

Directory containing tool contract files.

**Default**: `tools`

**Example**:

```yaml
check:
  tools_dir: contracts
```

### `max_output_size_kb`

Default maximum output size in kilobytes.

**Default**: `50` KB

**Example**:

```yaml
check:
  max_output_size_kb: 100 # 100 KB
```

### `strict_mode`

Treat warnings as errors globally.

**Default**: `false`

**Example**:

```yaml
check:
  strict_mode: true # Warnings become errors
```

## Per-Tool Configuration

Override global settings in individual tool contract files:

```yaml
version: 1
tool: fetch_user

contract:
  input_schema: FetchUserRequest
  output_schema: User

guarantees:
  max_output_size: 1mb # Override global limit
  max_execution_time: 5m # Override global timeout
  side_effects: none # No side effects allowed
```

## Guarantee Options

### `max_output_size`

Maximum output size for this tool.

**Format**: `<number><unit>` (e.g., `"50kb"`, `"1mb"`, `"2gb"`)

**Example**:

```yaml
guarantees:
  max_output_size: 1mb
```

### `max_execution_time`

Maximum execution time for this tool.

**Format**: `<number><unit>` (e.g., `"30s"`, `"5m"`, `"2h"`)

**Example**:

```yaml
guarantees:
  max_execution_time: 30s
```

### `side_effects`

Allowed side effects for this tool.

**Values**:

- `none`: No side effects allowed
- `filesystem`: Temp directory writes allowed

**Example**:

```yaml
guarantees:
  side_effects: none
```

### `dependencies`

List of tools this tool depends on.

**Example**:

```yaml
guarantees:
  dependencies:
    - fetch_user
    - validate_data
```

## Environment Variables

Set environment variables for test execution:

### Global Environment

Set in `syrin.yaml`:

```yaml
check:
  env:
    API_URL: 'https://api.example.com'
    DEBUG: 'true'
```

### Per-Test Environment

Set in individual test cases:

```yaml
tests:
  - name: test_with_env
    input:
      api_key: 'test-key'
    env:
      API_URL: 'https://test-api.example.com'
      DEBUG: 'true'
    expect:
      output_schema: Result
```

## Configuration Precedence

Configuration is resolved in this order (highest to lowest priority):

1. **Command-line flags**: `--tool`, `--strict`, etc.
2. **Per-tool guarantees**: Settings in contract file
3. **Global config**: Settings in `syrin.yaml`
4. **Defaults**: Built-in default values

## Examples

### High-Performance Tools

For tools that need more resources:

```yaml
check:
  timeout_ms: 120000 # 2 minutes
  max_output_size_kb: 500 # 500 KB
```

### Fast Tools

For tools that should be quick:

```yaml
check:
  timeout_ms: 5000 # 5 seconds
```

### Tools with Side Effects

For tools that write to temp directory:

```yaml
guarantees:
  side_effects: filesystem
  max_output_size: 10mb
```

## Best Practices

### 1. Set Realistic Limits

Base limits on actual tool behavior:

```yaml
guarantees:
  max_output_size: 1mb # Based on actual output size
  max_execution_time: 30s # Based on actual execution time
```

### 2. Use Per-Tool Overrides

Override global settings only when necessary:

```yaml
# Global: Conservative defaults
check:
  timeout_ms: 30000
  max_output_size_kb: 50

# Per-tool: Specific needs
guarantees:
  max_output_size: 1mb # This tool needs more
```

### 3. Declare All Dependencies

Always declare tool dependencies:

```yaml
guarantees:
  dependencies:
    - fetch_user
    - validate_data
```

## See Also

- [Writing Test Cases](/testing/writing-test-cases/)
- [Test Execution Process](/testing/test-execution/)
- [Writing Test Cases](/testing/writing-test-cases/) - Tool contract documentation
