---
title: 'syrin.yaml'
description: 'How Syrin defines and enforces execution assumptions via syrin.yaml'
weight: '3'
---

# Configuration Your Project Needs!

Syrin is configured through a single, explicit configuration file: `syrin.yaml`.

This file defines **how execution enters the system**, **which agents and models may act**, and **how Syrin connects to your MCP server**. It is created during `syrin init` and is treated as the **source of truth** for execution assumptions.

Syrin does not infer configuration.\
If a behaviour is not declared here, it is not assumed.

## Configuration File Location

The configuration file is located at:

```
syrin.yaml
```

All Syrin commands resolve configuration relative to the project root.

## Configuration Structure

A minimal example looks like this:

```yaml
version: '1.0'

project_name: 'my-project'
agent_name: 'My Agent'

transport: 'stdio' # or "http"

mcp_url: 'http://localhost:3000' # Required for http transport
script: 'python server.py' # Required for stdio transport

llm:
  openai:
    API_KEY: 'OPENAI_API_KEY'
    MODEL_NAME: 'OPENAI_MODEL'
    default: true

  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL'
    default: false

  ollama:
    MODEL_NAME: 'OLLAMA_MODEL_NAME'
    default: false
```

This file is read by Syrin on every run.\
Changes take effect immediately.

## Configuration Fields

| Field          | Type                  | Required    | Description                               |
| -------------- | --------------------- | ----------- | ----------------------------------------- |
| `version`      | string                | Yes         | Configuration version (currently `"1.0"`) |
| `project_name` | string                | Yes         | Logical project identifier                |
| `agent_name`   | string                | Yes         | Logical agent name used in execution      |
| `transport`    | `"stdio"` or `"http"` | Yes         | MCP transport type                        |
| `mcp_url`      | string                | Conditional | Required when `transport` is `http`       |
| `script`       | string                | Conditional | Required when `transport` is `stdio`      |
| `llm`          | object                | Yes         | LLM provider definitions                  |

Each field exists to remove ambiguity at runtime.

## Transport Configuration

The `transport` field determines how Syrin connects to the MCP server.

### stdio Transport

Use `stdio` when the MCP server runs as a process and communicates via standard input and output.

```yaml
transport: 'stdio'
script: 'python server.py'
```

The `script` field defines the exact command Syrin will run.

Valid forms include:

- Simple commands: `python server.py`
- Commands with arguments: `node index.js --port 3000`
- Absolute paths: `/usr/local/bin/my-mcp-server`
- Commands available in PATH

When using `stdio`, Syrin manages the server lifecycle.

### http Transport

Use `http` when the MCP server exposes an HTTP endpoint.

```yaml
transport: 'http'
mcp_url: 'http://localhost:3000'
```

The server must already be running.\
Syrin connects to it but does not manage its lifecycle.

The URL should point directly to the MCP endpoint.

## LLM Provider Configuration

Syrin supports multiple LLM providers. Each provider is defined explicitly under the `llm` key.

Only declared providers may propose actions.

### OpenAI

```yaml
llm:
  openai:
    API_KEY: 'OPENAI_API_KEY'
    MODEL_NAME: 'OPENAI_MODEL'
    default: true
```

Required environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (for example: `gpt-4`)

### Claude (Anthropic)

```yaml
llm:
  claude:
    API_KEY: 'ANTHROPIC_API_KEY'
    MODEL_NAME: 'ANTHROPIC_MODEL'
    default: false
```

Required environment variables:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

### Ollama

```yaml
llm:
  ollama:
    MODEL_NAME: 'OLLAMA_MODEL_NAME'
    default: false
```

The model name may reference:

- An environment variable
- A direct value, such as `llama2` or `mistral`

Example with direct value:

```yaml
llm:
  ollama:
    MODEL_NAME: 'llama2'
    default: false
```

## Environment Variables

Syrin never stores secrets in configuration files.

API keys and sensitive values must be supplied via environment variables.

Examples:

Shell:

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"
```

`.env` file:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

CI/CD:

- Define variables as secrets in your CI system
- Ensure they are available to the Syrin process

If a referenced variable is missing, Syrin will refuse to execute.

## Default LLM Provider

Exactly one provider should be marked as default.

```yaml
llm:
  openai:
    default: true
  claude:
    default: false
```

If no provider is marked as default, Syrin uses the first declared provider.

Ambiguous defaults are treated as configuration errors.

## Configuration Validation

Always validate configuration changes:

```bash
syrin doctor
```

This checks:

- File existence and YAML correctness
- Required fields
- Transport-specific requirements
- LLM provider definitions
- Environment variable availability

If validation fails, execution should not proceed.

## Updating Configuration

Interactive update:

```bash
syrin update
```

Manual update:

- Edit `syrin.yaml`
- Run `syrin doctor` to validate

Syrin does not auto-correct configuration.

## Configuration Backup and Rollback

When configuration is updated through Syrin commands, backups are created automatically.

To roll back:

```bash
syrin rollback
```

Manual edits should be version-controlled externally.

## How Syrin Uses This File

\`syrin.yaml\` defines **execution boundaries**, not preferences.

It tells Syrin:

- How to reach the MCP server
- Which models may propose actions
- Which assumptions are valid at runtime

If execution behaviour feels unexpected, this file is the first place to inspect.

## See Also

- [Transport Types](/configuration/transport/)
- [syrin doctor](/commands/syrin-doctor/)
- [syrin test](/commands/syrin-test/)
- [syrin dev](/commands/syrin-dev/)
