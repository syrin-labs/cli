---
title: 'CLI Reference'
description: 'Complete reference for all Syrin CLI commands, flags, and options'
weight: '0'
---

# Syrin CLI Reference

Complete reference for all Syrin CLI commands, global options, and command aliases.

## Quick Start

```bash
# Initialize a project
syrin init

# Check project health
syrin status

# Validate configuration
syrin doctor

# Start interactive development
syrin dev --exec
```

## Global Options

These options can be used with **any command**.

| Flag        | Short | Description                  |
| ----------- | ----- | ---------------------------- |
| `--version` | `-v`  | Display the current version  |
| `--help`    | `-h`  | Display help for the command |
| `--quiet`   | `-q`  | Minimal output (errors only) |
| `--verbose` |       | Verbose output for debugging |

### Using Global Options

Global options appear **before** the command:

```bash
# Quiet mode - show only errors
syrin --quiet doctor

# Verbose mode - show debug information
syrin --verbose dev --exec

# Check version
syrin --version
syrin -v

# Get help
syrin --help
syrin -h
```

### Quiet Mode

Quiet mode suppresses all informational output, showing only errors:

```bash
# Normal output
syrin status
# Shows full status report

# Quiet mode
syrin --quiet status
# Shows nothing if successful, errors only if problems
```

**Use cases for quiet mode:**

- CI/CD pipelines where you only care about failures
- Scripts that parse output
- Batch processing where verbose output is noise

### Verbose Mode

Verbose mode enables debug-level output for troubleshooting:

```bash
syrin --verbose dev --exec
```

**Use cases for verbose mode:**

- Debugging connection issues
- Understanding command behavior
- Reporting bugs with detailed logs

## Command Aliases

Syrin provides short aliases for frequently used commands.

| Command        | Alias       | Description                    |
| -------------- | ----------- | ------------------------------ |
| `syrin list`   | `syrin ls`  | List tools, resources, prompts |
| `syrin doctor` | `syrin doc` | Validate configuration         |
| `syrin config` | `syrin cfg` | Manage configuration           |

### Using Aliases

```bash
# These are equivalent
syrin list tools
syrin ls tools

# These are equivalent
syrin doctor
syrin doc

# These are equivalent
syrin config list
syrin cfg list
```

## Commands Overview

### Project Setup

| Command                                  | Description                            |
| ---------------------------------------- | -------------------------------------- |
| [`syrin init`](/commands/init/)          | Initialize a new Syrin project         |
| [`syrin init --global`](/commands/init/) | Create global configuration            |
| [`syrin status`](/commands/status/)      | Quick overview of project health       |
| [`syrin doctor`](/commands/doctor/)      | Comprehensive configuration validation |

### Configuration Management

| Command                                         | Description                   |
| ----------------------------------------------- | ----------------------------- |
| [`syrin config list`](/commands/config/)        | List all configuration values |
| [`syrin config set`](/commands/config/)         | Set a configuration value     |
| [`syrin config get`](/commands/config/)         | Get a configuration value     |
| [`syrin config edit`](/commands/config/)        | Edit configuration in editor  |
| [`syrin config edit-env`](/commands/config/)    | Edit environment file         |
| [`syrin config set-default`](/commands/config/) | Set default LLM provider      |
| [`syrin config remove`](/commands/config/)      | Remove an LLM provider        |

### Development & Testing

| Command                                      | Description                       |
| -------------------------------------------- | --------------------------------- |
| [`syrin dev`](/commands/dev/)                | Interactive development mode      |
| [`syrin dev --exec`](/commands/dev/)         | Development mode with execution   |
| [`syrin list`](/commands/list/)              | List MCP server capabilities      |
| [`syrin test`](/commands/test/)              | Validate tool contracts           |
| [`syrin test --connection`](/commands/test/) | Test MCP connection               |
| [`syrin analyse`](/commands/analyse/)        | Static analysis of tool contracts |

### Version Management

| Command                                 | Description                    |
| --------------------------------------- | ------------------------------ |
| [`syrin update`](/commands/update/)     | Update to the latest version   |
| [`syrin rollback`](/commands/rollback/) | Rollback to a previous version |

## Common Workflows

### New Project Setup

```bash
# 1. Initialize the project
syrin init

# 2. Set up API keys
syrin config edit-env

# 3. Validate setup
syrin doctor

# 4. List available tools
syrin ls tools

# 5. Start development
syrin dev --exec
```

### Quick Testing (Global Config)

```bash
# 1. Set up global config once
syrin init --global
syrin config edit-env --global

# 2. Test from any directory
syrin dev --transport http --url http://localhost:8000/mcp
```

### CI/CD Pipeline

```bash
# Quiet mode for cleaner logs
syrin --quiet doctor || exit 1
syrin --quiet analyse --ci || exit 1
syrin --quiet test --ci || exit 1
```

### Debugging Issues

```bash
# Check status first
syrin status

# If issues, run detailed diagnostics
syrin doctor

# Enable verbose mode for more details
syrin --verbose dev --exec
```

## Exit Codes

All commands follow consistent exit code conventions:

| Code | Meaning                              |
| ---- | ------------------------------------ |
| `0`  | Success                              |
| `1`  | Error (validation, connection, etc.) |

Exit codes are stable and suitable for scripting and CI pipelines.

## Environment Variables

Syrin respects these environment variables:

| Variable            | Description                        |
| ------------------- | ---------------------------------- |
| `EDITOR`            | Preferred editor for `config edit` |
| `VISUAL`            | Fallback editor                    |
| `OPENAI_API_KEY`    | OpenAI API key                     |
| `OPENAI_MODEL`      | OpenAI model name                  |
| `ANTHROPIC_API_KEY` | Claude API key                     |
| `ANTHROPIC_MODEL`   | Claude model name                  |
| `OLLAMA_MODEL_NAME` | Ollama model name                  |

## Getting Help

### Command-Specific Help

```bash
# Help for any command
syrin init --help
syrin dev --help
syrin config --help

# Help for subcommands
syrin config set --help
```

### General Help

```bash
# Show all commands
syrin --help

# Show version
syrin --version
```

### Documentation

- **Full documentation:** https://docs.syrin.dev
- **GitHub issues:** https://github.com/syrin-labs/cli/issues
- **Examples:** https://github.com/syrin-labs/examples

## Command Index

| Command          | Alias     | Description             | Documentation                    |
| ---------------- | --------- | ----------------------- | -------------------------------- |
| `syrin init`     | -         | Initialize project      | [Read more](/commands/init/)     |
| `syrin status`   | -         | Project health overview | [Read more](/commands/status/)   |
| `syrin doctor`   | `doc`     | Validate configuration  | [Read more](/commands/doctor/)   |
| `syrin config`   | `cfg`     | Manage configuration    | [Read more](/commands/config/)   |
| `syrin dev`      | -         | Interactive development | [Read more](/commands/dev/)      |
| `syrin list`     | `ls`      | List MCP capabilities   | [Read more](/commands/list/)     |
| `syrin test`     | -         | Test tool contracts     | [Read more](/commands/test/)     |
| `syrin analyse`  | `analyze` | Static analysis         | [Read more](/commands/analyse/)  |
| `syrin update`   | -         | Update to latest        | [Read more](/commands/update/)   |
| `syrin rollback` | -         | Rollback version        | [Read more](/commands/rollback/) |
