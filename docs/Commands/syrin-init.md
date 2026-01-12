---
title: "syrin init"
description: "Initialise a Syrin-governed MCP project"
weight: "1"
---

## Initialise Syrin

Initialise Syrin in an MCP project and establish **runtime governance from the first execution**.

This command creates the minimum structure required for Syrin to act as the **execution authority** for your MCP server. Until `syrin init` is run, Syrin does not exist in the project, and no execution can be trusted or replayed.

## What This Command Does

Running `syrin init`:

- declares the project as **Syrin-governed**
- creates a project-local runtime configuration
- defines how MCP execution will be launched and observed
- establishes the foundation for deterministic execution and replay

This is not a convenience command.\
It is the point where MCP execution becomes **explicitly governed**.

## Usage

```bash
syrin init [options]
```

## Options

| Flag                    | Description                               | Default           |
| ----------------------- | ----------------------------------------- | ----------------- |
| `-y, --yes`             | Skip interactive prompts and use defaults | `false`           |
| `--project-root <path>` | Initialize Syrin in the given directory   | Current directory |

## How Initialization Works

When you run `syrin init`, Syrin performs the following steps:

1. Creates a `.syrin/` directory at the project root
2. Generates a `syrin.yaml` file that defines:
   - how the MCP server is executed
   - how the runtime connects to it
   - which LLMs may propose actions
3. Records execution assumptions explicitly instead of relying on convention
4. Updates `.gitignore` to exclude:
   - execution event data
   - local runtime history

After this step, **execution behavior is no longer implicit**.

## Interactive Initialization

```bash
syrin init
```

You will be prompted to define:

- **Project name**
- **Agent name**
- **Transport type**
  - `stdio`: Syrin spawns and controls the MCP process directly
  - `http`: Syrin connects to an already-running MCP server
- **Execution entrypoint**
  - command (for `stdio`)
  - MCP URL (for `http`)
- **LLM providers**

Each prompt maps directly to a runtime constraint.

## Non-Interactive Initialization

```bash
syrin init --yes
```

Creates a valid default configuration without prompts.

Use this when:

- bootstrapping via scripts
- initializing in CI
- standardizing project templates

You are expected to review and edit the configuration afterward.

## Configuration File Created

`syrin init` generates a `syrin.yaml` file.

This file is the **runtime contract** for the project.

```yaml
version: "1.0"

project_name: "my-project"
agent_name: "My Agent"

transport: "stdio" # or "http"

mcp_url: "http://localhost:3000" # required for http
script: "python server.py"        # required for stdio

llm:
  openai:
    API_KEY: "OPENAI_API_KEY"
    MODEL_NAME: "OPENAI_MODEL"
    default: true

  claude:
    API_KEY: "ANTHROPIC_API_KEY"
    MODEL_NAME: "ANTHROPIC_MODEL"
    default: false

  ollama:
    MODEL_NAME: "OLLAMA_MODEL_NAME"
    default: false
```

Syrin treats this file as **authoritative**.\
Execution that violates it is considered invalid.

## Environment Variables

Syrin does not store secrets.

All credentials are referenced via environment variables that **must exist at runtime**.

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"

# Claude
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# Ollama
export OLLAMA_MODEL_NAME="llama2"
```

If required variables are missing, Syrin will refuse to execute.

## Files and Directories Created

```
.syrin/
└── events/              # Execution events (created at runtime)

syrin.yaml               # Runtime authority configuration
.gitignore               # Updated to exclude Syrin runtime artefacts
```

Execution events are append-only and local by default.\
They are not source code.

## Why Initialisation Matters

Without running `syrin init`:

- Execution assumptions remain implicit
- Failures cannot be replayed
- Nondeterminism cannot be detected
- Production behaviour cannot be trusted

Initialisation is the transition from **best-effort MCP execution** to **governed execution**.

## Next Steps

After initialisation:

```bash
syrin doctor   # validate runtime setup
syrin test     # verify MCP connectivity
syrin dev      # start governed development
```

## See Also

- [Configuration](/configuration/)
- [syrin doctor](/commands/doctor/)
- [syrin dev](/commands/dev/)
- [syrin test](/commands/test/)
