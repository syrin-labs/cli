---
title: 'syrin status'
description: 'Quick overview of project health and configuration state'
weight: '2.5'
---

## What's the Situation?

Get a **quick overview of your project's health** with a single command.

`syrin status` provides an at-a-glance view of your Syrin project configuration, similar to how `git status` shows your repository state. It tells you what's configured, what's working, and what needs attention.

This command answers the essential question:

> Is my Syrin project ready to run?

## Purpose

When working across multiple projects or returning to a project after some time, you need quick answers:

- Is this project initialized?
- Which LLM providers are configured?
- Are my API keys set up?
- Do I have both local and global configs?

`syrin status` surfaces this information **instantly**, without running diagnostics or connecting to servers.

## Usage

```bash
syrin status [options]
```

## Options

| Flag                    | Description                  | Default           |
| ----------------------- | ---------------------------- | ----------------- |
| `--project-root <path>` | Syrin project root directory | Current directory |

## What `syrin status` Shows

### Configuration Status

Displays which configuration files exist:

- **Local config** - `syrin.yaml` in the current project
- **Global config** - `~/.syrin/syrin.yaml` for user-wide settings

### Project Information

When a local config exists:

- Project name
- Transport type (stdio or http)
- MCP URL or script command

### LLM Provider Status

For each configured provider:

- Provider name (openai, claude, ollama)
- Whether it's the default provider
- Configuration status (configured vs. not configured)

A provider is "configured" when its required environment variables are set.

### Environment Status

- Whether a `.env` file exists
- Location of the environment file

### Suggested Actions

If issues are detected, helpful suggestions are provided:

- How to initialize a project
- How to run diagnostics
- How to set up API keys

## Example Output

```bash
Syrin v1.4.0 (latest)

Configuration
────────────────────────────────────────
  ✓ Local config:  /path/to/project/syrin.yaml
  ✓ Global config: ~/.syrin/syrin.yaml

Project
────────────────────────────────────────
  Name:      my-mcp-server
  Transport: stdio
  Script:    python server.py

LLM Providers
────────────────────────────────────────
  ✓ openai (default): configured
  ✗ claude: not configured

Environment
────────────────────────────────────────
  ✓ .env file: /path/to/project/.env

Suggested Actions
────────────────────────────────────────
  💡 Run `syrin doctor` for detailed diagnostics
  💡 Run `syrin config edit-env` to set API keys
```

## When Status Shows Issues

### No Configuration Found

```bash
Configuration
────────────────────────────────────────
  ✗ Local config:  Not found
  ○ Global config: Not configured

Suggested Actions
────────────────────────────────────────
  💡 Run `syrin init` to initialize a project
```

**Resolution:** Run `syrin init` or `syrin init --global`

### Unconfigured Providers

```bash
LLM Providers
────────────────────────────────────────
  ✗ openai (default): not configured
```

**Resolution:** Set the required environment variables:

```bash
# Using .env file
syrin config edit-env

# Or export directly
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"
```

## Use Cases

### Quick Health Check

Before starting work on a project:

```bash
cd my-mcp-project
syrin status
```

### Verify Setup After Changes

After modifying configuration:

```bash
syrin config set openai.model "gpt-4-turbo"
syrin status
```

### Cross-Project Overview

When switching between projects:

```bash
cd project-a && syrin status
cd ../project-b && syrin status
```

### CI/CD Verification

In continuous integration, verify configuration exists:

```bash
syrin status || exit 1
```

## Differences from `syrin doctor`

| Aspect          | `syrin status`   | `syrin doctor`           |
| --------------- | ---------------- | ------------------------ |
| **Speed**       | Instant          | May take a moment        |
| **Depth**       | Overview         | Comprehensive validation |
| **Network**     | No connections   | May test connectivity    |
| **Purpose**     | Quick check      | Full diagnostics         |
| **When to use** | Frequent, casual | Before execution         |

Use `syrin status` for quick checks.\
Use `syrin doctor` for thorough validation before running commands.

## Exit Codes

| Code | Meaning                       |
| ---- | ----------------------------- |
| `0`  | Status displayed successfully |
| `1`  | Error retrieving status       |

## Relationship to Other Commands

- **`syrin init`** - Creates the configuration that status reports on
- **`syrin doctor`** - Provides deeper validation
- **`syrin config`** - Modifies configuration values
- **`syrin dev`** - Requires configuration to be valid

`syrin status` is the fastest way to understand your project's configuration state.

## See Also

- [syrin doctor](/commands/doctor/) - Comprehensive validation
- [syrin init](/commands/init/) - Initialize a project
- [syrin config](/commands/config/) - Manage configuration
