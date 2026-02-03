---
title: 'syrin analyse'
description: 'Static analysis of MCP tool contracts, structure, and dependencies'
weight: '5'
---

## Analyse why MCP doesn't work as expected

Perform **static analysis** on MCP tool contracts.

`syrin analyse` inspects the shape, clarity, and correctness of your MCP server’s declared tools **before execution**. It surfaces errors, warnings, and structural risks that otherwise appear later as runtime failures, confusing LLM behaviour, or hard-to-debug agent behaviour.

This command exists because **MCP systems fail at the contract layer long before they fail at runtime**.

It answers a simple but critical question:

> Are my MCP tools defined clearly enough for reliable LLM-driven execution?

## Why This Command Exists

In MCP systems, tools are not just functions.\
They are **interfaces that LLMs reason over**.

Common failure patterns include:

- Tools with missing or vague descriptions
- Parameters that are underspecified or misleading
- Implicit dependencies between tools
- Contract drift as tools evolve

LLMs do not see implementation details.\
They only see contracts.

`syrin analyse` treats tool contracts as a first-class engineering concern.

## Usage

```bash
syrin analyse [options]
```

**Alias:** `syrin analyze` (American spelling)

## Options

| Flag                     | Description                                 | Default            |
| ------------------------ | ------------------------------------------- | ------------------ |
| `--ci`                   | Run in CI mode, fail on warnings or errors  | `false`            |
| `--json`                 | Emit analysis results as JSON               | `false`            |
| `--graph`                | Generate a tool dependency graph            | `false`            |
| `--transport <type>`     | Transport type: `http` or `stdio`           | From configuration |
| `--url <url>`            | MCP URL for HTTP transport                  | From configuration |
| `--script <script>`      | Script for stdio transport                  | From configuration |
| `--project-root <path>`  | Syrin project root directory                | Current directory  |
| `--env <key=value>`      | Environment variable for stdio (repeatable) | None               |
| `--auth-header <header>` | Auth header for HTTP transport (repeatable) | None               |

**Global Options:**

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

```bash
# Quiet mode for CI
syrin --quiet analyse --ci

# Verbose mode for debugging
syrin --verbose analyse
```

## What syrin analyse Does

`syrin analyse` performs **static inspection only**.

It does not:

- Execute tools
- Run workflows
- Depend on runtime behaviour

Instead, it analyses what the MCP server **declares**, not what it does at runtime.

The analysis is deterministic and repeatable.

## Analysis Performed

### Tool Contract Validation

Each tool contract is checked for structural completeness.

Checks include:

- Tool name validity
- Presence of a tool description
- Valid JSON Schema for inputs
- Explicit required parameters
- Correct parameter types

A tool without a clear contract is considered unsafe to rely on.

### Parameter Schema Analysis

Parameters are analysed individually.

Syrin checks:

- JSON Schema compliance
- Required vs optional distinction
- Default value consistency
- Presence and quality of parameter descriptions

Ambiguous schemas are a frequent source of incorrect LLM decisions.

### Description Quality Analysis

Descriptions are not cosmetic.\
They directly influence LLM behaviour.

Syrin flags:

- Missing descriptions (errors)
- Generic or placeholder descriptions (warnings)
- Descriptions that do not match the schema intent

Poor descriptions lead to unpredictable tool usage.

### Best Practice Checks

Syrin applies MCP-specific best practices derived from real failure modes.

This includes:

- Naming clarity
- Contract consistency
- Avoidance of unnecessary complexity
- Alignment between schema and description

These checks exist to reduce ambiguity, not enforce style.

### Dependency Analysis

When `--graph` is enabled, Syrin analyses relationships between tools.

It:

- Identifies tools that reference or rely on others
- Builds a dependency graph
- Highlights tight coupling or circular dependencies

Implicit dependencies make execution brittle and hard to reason about.

## Examples

### Basic Analysis

```bash
syrin analyse
```

Runs static analysis and prints a readable report.

### CI Mode

```bash
syrin analyse --ci
```

In CI mode:

- Warnings are treated as failures
- Exit codes are strict
- Output is stable and machine-friendly

This mode is intended for production pipelines.

### JSON Output

```bash
syrin analyse --json > analysis.json
```

Useful for:

- CI annotations
- Dashboards
- Custom tooling

### Dependency Graph

```bash
syrin analyse --graph
```

Generates a visual graph of tool dependencies.

This is most useful once tools start depending on each other implicitly.

## Example Output

![Syrin Analyse Errors](/images/commands/syrin-analyse-errors.png)

Errors indicate contracts that should be fixed.\
Warnings indicate risks that often surface under real usage.

## JSON Output Structure

```json
{
  "summary": {
    "total": 5,
    "passed": 3,
    "warnings": 1,
    "errors": 1
  },
  "tools": [
    {
      "name": "read_file",
      "status": "warning",
      "issues": [
        {
          "severity": "warning",
          "code": "DESC_GENERIC",
          "message": "Parameter 'encoding' has a generic description"
        }
      ]
    }
  ]
}
```

The JSON schema is stable and suitable for automation.

## Exit Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| `0`  | Analysis completed without blocking issues |
| `1`  | Errors found, or warnings in CI mode       |

![Syrin Analyse Passed](/images/commands/syrin-analyse-passed.png)

## Common Issues Detected

### Missing Descriptions

Meaning\
The LLM does not have enough context to use the tool correctly.

Resolution\
Add a clear, specific description explaining intent and usage.

### Generic Descriptions

Meaning\
The LLM cannot distinguish this parameter from others.

Resolution\
Describe purpose, constraints, and expected values.

### Invalid Schemas

Meaning\
The contract is ambiguous or malformed.

Resolution\
Validate schemas against the JSON Schema specification.

### Implicit Dependencies

Meaning\
Execution assumptions are hidden across tools.

Resolution\
Make dependencies explicit or refactor the tool design.

![Syrin Analyse Warnings](/images/commands/syrin-analyse-warnings.png)

## When You Should Run This

- After adding or modifying tools
- Before enabling `syrin dev --exec`
- Before production deployment
- In CI pipelines
- When LLM behaviour feels inconsistent

If tool contracts drift, execution quality degrades quietly.

## Relationship to Other Commands

- `syrin list` shows what tools exist
- `syrin analyse` evaluates whether they are well-defined
- `syrin dev` exposes runtime behaviour
- `syrin test` validates protocol compliance

Static correctness comes before runtime correctness.

## See Also

- [syrin list](/commands/list/)
- [syrin test](/commands/test/)
- [syrin dev](/commands/dev/)
- [Configuration](/configuration/)
