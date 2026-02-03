---
title: 'syrin doctor'
description: 'Validate and enforce the correctness of a Syrin-governed MCP project'
weight: '2'
---

## Hey doctor, how is the setup?

Validate the **correctness, completeness, and viability** of a Syrin-governed MCP project.

`syrin doctor` is an enforcement command.\
It verifies that your project satisfies the **minimum runtime requirements** required for Syrin to govern MCP execution safely.

If `syrin doctor` reports issues, the project is **not in a valid state to run**.

## Purpose

MCP systems fail most often due to **incorrect assumptions**, not faulty code.

`syrin doctor` exists to surface these failures **before execution**, when they are still deterministic and fixable.

This command answers one question:

> Is this project configured in a way that execution can be trusted?

## Usage

```bash
syrin doctor [options]
```

**Alias:** `syrin doc`

## Options

| Flag                    | Description                    | Default           |
| ----------------------- | ------------------------------ | ----------------- |
| `--project-root <path>` | Path to the Syrin project root | Current directory |

**Global Options:**

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--quiet`   | Minimal output (errors only) |
| `--verbose` | Verbose output for debugging |

```bash
# Using alias
syrin doc

# Quiet mode (CI-friendly)
syrin --quiet doctor

# Verbose mode (debugging)
syrin --verbose doctor
```

## What `syrin doctor` Does

`syrin doctor` performs a read-only validation of your project. It does not execute code and it does not modify files.

Specifically, it:

1. Validates configuration correctness
2. Verifies transport assumptions
3. Confirms LLM provider availability
4. Checks environment variable integrity

Any failure indicates that execution behaviour cannot be guaranteed.

## Checks Performed

### Configuration Integrity

- Verifies `syrin.yaml` exists
- Validates YAML syntax
- Ensures required fields are present
- Validates field types and allowed values

If the configuration is missing or malformed, execution is unsafe.

### Transport Validity

**HTTP Transport**

- Validates MCP URL format
- Ensures required HTTP fields are present
- Optionally checks reachability if the server is running

**stdio Transport**

- Verifies the execution command exists
- Confirms the command is resolvable
- Validates script path and permissions

If the runtime cannot reliably start or reach the MCP server, Syrin cannot enforce execution.

### LLM Provider Configuration

For each configured provider, Syrin validates **availability**, not model quality.

**OpenAI**

- Verifies `OPENAI_API_KEY` is set
- Validates key format
- Verifies `OPENAI_MODEL` is defined

**Claude**

- Verifies `ANTHROPIC_API_KEY` is set
- Validates key format
- Verifies `ANTHROPIC_MODEL` is defined

**Ollama**

- Verifies the model name is defined
- Validates local service availability when applicable

If a provider is marked as default but cannot be used, execution is invalid.

### Environment Variables

- Verifies all referenced environment variables exist
- Detects missing or misspelt variables
- Flags unused but defined variables

Syrin does not infer missing values.\
Missing environment variables are treated as hard failures.

## Example

```bash
syrin doctor
```

Example output:

If any check fails, execution should not proceed.

![Syrin Doctor](/images/commands/syrin-doctor.png)

## Common Failures and Meaning

### Configuration File Missing

Meaning\
Syrin has no execution contract for the project.

Resolution

```bash
syrin init
```

### Invalid YAML or Schema

Meaning\
Execution assumptions are ambiguous or contradictory.

Resolution\
Fix indentation, field names, or invalid values in `syrin.yaml`.

### Missing Environment Variables

Meaning\
The runtime cannot guarantee execution behaviour.

Resolution

```bash
export OPENAI_API_KEY="sk-..."
```

Ensure variables are available in the same environment where Syrin runs.

### Invalid Transport Configuration

Meaning\
Syrin cannot reliably start or connect to the MCP server.

Resolution

- Ensure `transport` matches the configured fields
- Use `script` for `stdio`
- Use `mcp_url` for `http`

## Exit Codes

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| `0`  | All checks passed, execution may proceed |
| `1`  | One or more blocking issues detected     |

Exit codes are stable and suitable for CI pipelines.

## When You Should Run This

- Before starting development
- After changing the configuration
- Before running tests
- In CI before deployment
- When execution behaviour is unexpected

Running `syrin doctor` frequently is expected.

## Relationship to Other Commands

- `syrin init` creates the execution contract
- `syrin doctor` validates the contract
- `syrin dev` enforces the contract at runtime

Skipping `syrin doctor` means accepting unchecked execution assumptions.

## See Also

- [syrin init](/commands/init/)
- [Configuration](/configuration/)
- [syrin dev](/commands/dev/)
- [syrin test](/commands/test/)
